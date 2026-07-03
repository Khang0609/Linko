from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.main import app


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def render_openapi() -> str:
    return json.dumps(app.openapi(), ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Export the FastAPI OpenAPI schema.")
    parser.add_argument(
        "--output",
        type=Path,
        default=repo_root() / "packages" / "contracts" / "openapi.json",
        help="Path to write the OpenAPI schema.",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Fail if the output file differs from the generated schema.",
    )
    args = parser.parse_args()

    output_path = args.output
    if not output_path.is_absolute():
        output_path = (Path.cwd() / output_path).resolve()

    rendered = render_openapi()
    if args.check:
        existing = output_path.read_text(encoding="utf-8") if output_path.exists() else ""
        if existing != rendered:
            raise SystemExit(f"{output_path} is out of date. Run the OpenAPI export before committing.")
        return

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(rendered, encoding="utf-8")


if __name__ == "__main__":
    main()
