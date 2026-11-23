import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("backup_storage", Path(__file__).parents[1] / "verify-backup-storage.py")
backup_storage = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup_storage)


class BackupStorageTest(unittest.TestCase):
    def setUp(self):
        self.scope = tempfile.TemporaryDirectory(prefix="candy-backup-fixture-")
        self.addCleanup(self.scope.cleanup)
        self.root = Path(self.scope.name)
        self.archive = self.root / "storage.tar.gz"
        self.references = self.root / "references.json"

    def create_archive(self, name="contracts/fixture.pdf", link=False):
        with tarfile.open(self.archive, "w:gz") as archive:
            member = tarfile.TarInfo(name)
            if link:
                member.type = tarfile.SYMTYPE
                member.linkname = "../../outside"
                archive.addfile(member)
            else:
                data = b"synthetic private fixture"
                member.size = len(data)
                archive.addfile(member, io.BytesIO(data))
        self.references.write_text(json.dumps([name]), encoding="utf-8")

    def test_extracts_and_reads_references_then_cleans_only_its_directory(self):
        sentinel = self.root / "preserve.txt"
        sentinel.write_text("preserve", encoding="utf-8")
        self.create_archive()
        result = backup_storage.verify_storage(self.archive, self.references, self.root)
        self.assertEqual(result, {"files": 1, "references": 1})
        self.assertEqual(sentinel.read_text(encoding="utf-8"), "preserve")
        self.assertEqual(list(self.root.glob("ava-storage-*")), [])

    def test_missing_database_reference_fails_without_exposing_its_name(self):
        self.create_archive()
        self.references.write_text(json.dumps(["contracts/missing-private-name.pdf"]), encoding="utf-8")
        with self.assertRaises(backup_storage.StorageVerificationError) as result:
            backup_storage.verify_storage(self.archive, self.references, self.root)
        self.assertNotIn("missing-private-name", str(result.exception))
        self.assertEqual(list(self.root.glob("ava-storage-*")), [])

    def test_rejects_traversal_absolute_paths_and_links(self):
        for name, link in [("../escape", False), ("/absolute", False), ("C:/escape", False), ("contracts/link", True)]:
            with self.subTest(link=link):
                self.create_archive(name, link)
                with self.assertRaises(backup_storage.StorageVerificationError):
                    backup_storage.verify_storage(self.archive, self.references, self.root)
                self.assertEqual(list(self.root.glob("ava-storage-*")), [])

    def test_rejects_a_truncated_gzip_stream(self):
        self.create_archive()
        self.archive.write_bytes(self.archive.read_bytes()[:-8])
        with self.assertRaises((EOFError, OSError)):
            backup_storage.verify_storage(self.archive, self.references, self.root)


if __name__ == "__main__":
    unittest.main()
