#!/usr/bin/env python3
import argparse
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path


WEEKDAYS = {
    "segunda": ("Segunda-feira", 0),
    "terca": ("Terça-feira", 1),
    "quinta": ("Quinta-feira", 3),
}


def iso_date(value: str, expected_weekday: int, label: str) -> str:
    try:
        parsed = datetime.strptime(value, "%Y-%m-%d")
    except ValueError as exc:
        raise SystemExit(f"{label}: use a data no formato AAAA-MM-DD.") from exc
    if parsed.weekday() != expected_weekday:
        raise SystemExit(f"{label}: a data {value} não corresponde ao dia informado.")
    return value


def non_negative(value: str, label: str) -> int:
    try:
        number = int(value)
    except ValueError as exc:
        raise SystemExit(f"{label}: informe um número inteiro.") from exc
    if number < 0:
        raise SystemExit(f"{label}: a quantidade não pode ser negativa.")
    return number


def main() -> None:
    parser = argparse.ArgumentParser()
    for key in WEEKDAYS:
        parser.add_argument(f"--data-{key}", required=True)
        parser.add_argument(f"--vagas-comuns-{key}", required=True)
        parser.add_argument(f"--vagas-emergenciais-{key}", required=True)
    args = parser.parse_args()

    days = []
    for key, (name, weekday) in WEEKDAYS.items():
        date_value = iso_date(getattr(args, f"data_{key}"), weekday, name)
        regular_vacancies = non_negative(
            getattr(args, f"vagas_comuns_{key}"),
            f"{name} — vagas comuns",
        )
        emergency_vacancies = non_negative(
            getattr(args, f"vagas_emergenciais_{key}"),
            f"{name} — vagas emergenciais",
        )
        days.append(
            {
                "id": key,
                "dia": name,
                "data": date_value,
                "vagasComuns": regular_vacancies,
                "vagasEmergenciais": emergency_vacancies,
            }
        )

    recife = timezone(timedelta(hours=-3))
    payload = {
        "atualizadoEm": datetime.now(recife).replace(microsecond=0).isoformat(),
        "dias": days,
    }
    target = Path(__file__).resolve().parents[1] / "agenda-odontologica.json"
    target.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
