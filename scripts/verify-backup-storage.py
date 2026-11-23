#!/usr/bin/env python3
"""Verify an AVA storage archive using only a disposable restore directory."""
import gzip
import json
from pathlib import Path, PurePosixPath
import shutil
import sys
import tarfile
import tempfile
import zlib


class StorageVerificationError(Exception):
    pass


def safe_path(root, value):
    if not isinstance(value, str) or not value or "\\" in value or "\x00" in value:
        raise StorageVerificationError("Caminho inseguro no storage do backup.")
    relative = PurePosixPath(value)
    if relative.is_absolute() or ".." in relative.parts or any(":" in part for part in relative.parts):
        raise StorageVerificationError("Caminho inseguro no storage do backup.")
    target = root.joinpath(*relative.parts).resolve()
    if not target.is_relative_to(root):
        raise StorageVerificationError("Caminho fora do diretorio descartavel.")
    return target


def verify_storage(archive_path, references_path, temporary_parent):
    parent = Path(temporary_parent).resolve(strict=True)
    if not parent.is_dir() or parent == Path(parent.anchor):
        raise StorageVerificationError("Diretorio descartavel invalido.")
    references = json.loads(Path(references_path).read_text(encoding="utf-8"))
    if not isinstance(references, list) or any(not isinstance(value, str) for value in references):
        raise StorageVerificationError("Referencias de arquivos invalidas.")
    # Consume the gzip stream through its trailer, checking CRC and truncation.
    with gzip.open(archive_path, "rb") as compressed:
        while compressed.read(1024 * 1024):
            pass
    file_count = 0
    with tempfile.TemporaryDirectory(prefix="ava-storage-", dir=parent) as directory:
        destination = Path(directory).resolve(strict=True)
        with tarfile.open(archive_path, "r:gz") as archive:
            for member in archive:
                target = safe_path(destination, member.name)
                if member.isdir():
                    target.mkdir(parents=True, exist_ok=True)
                    continue
                if not member.isfile():
                    raise StorageVerificationError("O storage contem um tipo de arquivo nao permitido.")
                target.parent.mkdir(parents=True, exist_ok=True)
                source = archive.extractfile(member)
                if source is None:
                    raise StorageVerificationError("Arquivo do storage nao pode ser lido.")
                with source, target.open("xb") as output:
                    shutil.copyfileobj(source, output, 1024 * 1024)
                file_count += 1
        for reference in set(references):
            target = safe_path(destination, reference)
            if not target.is_file():
                raise StorageVerificationError("Arquivo privado referenciado nao pode ser lido.")
            with target.open("rb") as restored_file:
                while restored_file.read(1024 * 1024):
                    pass
    return {"files": file_count, "references": len(set(references))}


def main():
    if len(sys.argv) != 4:
        print("Uso: verify-backup-storage.py storage.tar.gz references.json diretorio-descartavel", file=sys.stderr)
        return 2
    try:
        result = verify_storage(*sys.argv[1:])
    except (StorageVerificationError, OSError, EOFError, tarfile.TarError, ValueError, zlib.error):
        print("Falha na integridade ou leitura dos arquivos do AVA no ensaio isolado.", file=sys.stderr)
        return 1
    print("Storage AVA verificado: %d arquivo(s), %d referencia(s) legivel(is)." % (result["files"], result["references"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
