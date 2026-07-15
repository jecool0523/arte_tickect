"""Supabase의 톡톡 예매 좌석을 읽어 HTML 좌석 배치도로 생성합니다."""

import html
import json
import os
import re
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


MUSICAL_ID = "toctoc"
BOOKING_TABLE = "toctoc_bookings"
OUTPUT_FILENAME = "전체_좌석_배치도_완성본.html"

ZONE_SETTINGS = {
    "1층 앞 (VIP)": {"floor": "F1", "grade": "VIP", "rows": 9},
    "1층 뒤 (R석)": {"floor": "F1", "grade": "R", "rows": 8},
    "2층 (S석)": {"floor": "F2", "grade": "S", "rows": 8},
}
SECTION_NAMES = {"L": "왼쪽", "C": "중앙", "R": "오른쪽"}
SECTION_COUNTS = {"L": 6, "C": 12, "R": 6}
SEAT_ID_PATTERN = re.compile(r"^(F[12])-(VIP|R|S)-R(\d{2})-([LCR])(\d{2})$")
ATTENDEE_PATTERN = re.compile(
    r"\[(?:1층|2층).*?(\d+)열\s+(왼쪽|중앙|오른쪽)\s+(\d+)번\]\s*(.*?)\s*\(([^()]*)\)"
)


def load_project_env() -> None:
    """스크립트를 직접 실행해도 프로젝트의 .env.local을 사용할 수 있게 합니다."""
    project_env = Path(__file__).resolve().parents[3] / "arte_tickect" / ".env.local"
    if not project_env.exists():
        return

    for line in project_env.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def supabase_get(path: str, params: dict[str, str]) -> list[dict]:
    load_project_env()
    base_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not base_url or not service_key:
        raise RuntimeError(
            "NEXT_PUBLIC_SUPABASE_URL(SUPABASE_URL)와 SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다."
        )

    query = urlencode(params)
    request = Request(
        f"{base_url.rstrip('/')}/rest/v1/{path}?{query}",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Accept": "application/json",
        },
        method="GET",
    )
    try:
        with urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase 조회 실패 ({error.code}): {detail}") from error
    except URLError as error:
        raise RuntimeError(f"Supabase 연결 실패: {error.reason}") from error


def parse_seat_id(seat_id: str) -> dict | None:
    match = SEAT_ID_PATTERN.fullmatch(str(seat_id).strip())
    if not match:
        return None
    floor, grade, row, section, number = match.groups()
    return {
        "floor": floor,
        "grade": grade,
        "row": int(row),
        "section": section,
        "num": int(number),
        "id": seat_id,
    }


def parse_attendees(special_request: str | None) -> dict[tuple[str, int, str, int], dict]:
    attendees = {}
    for row, section_name, number, name, student_id in ATTENDEE_PATTERN.findall(special_request or ""):
        section = next((key for key, value in SECTION_NAMES.items() if value == section_name), None)
        if section:
            attendees[(int(row), section, int(number))] = {
                "name": name.strip(),
                "student_id": student_id.strip(),
            }
    return attendees


def load_confirmed_bookings() -> list[dict]:
    return supabase_get(
        BOOKING_TABLE,
        {
            "select": "id,name,student_id,selected_seats,special_request,booking_date,status",
            "status": "eq.confirmed",
            "order": "booking_date.desc",
        },
    )


def structure_bookings(bookings: list[dict]) -> dict:
    all_data = {zone: {} for zone in ZONE_SETTINGS}
    for booking in bookings:
        attendees = parse_attendees(booking.get("special_request"))
        for raw_seat_id in booking.get("selected_seats") or []:
            seat = parse_seat_id(raw_seat_id)
            if not seat:
                print(f"⚠️ 해석할 수 없는 좌석 ID를 건너뜁니다: {raw_seat_id}")
                continue

            zone = next(
                (name for name, settings in ZONE_SETTINGS.items()
                 if settings["floor"] == seat["floor"] and settings["grade"] == seat["grade"]),
                None,
            )
            if not zone:
                continue

            person = attendees.get((seat["row"], seat["section"], seat["num"]), {
                "name": booking.get("name", ""),
                "student_id": str(booking.get("student_id", "")),
            })
            all_data[zone].setdefault(seat["section"], {}).setdefault(seat["row"], []).append(
                {**seat, **person, "booking_id": booking.get("id")}
            )
    return all_data


def create_fixed_layout_html(all_data: dict, bookings: list[dict]) -> str:
    occupied_count = sum(len(seats) for zone in all_data.values() for rows in zone.values() for seats in rows.values())
    esc = lambda value: html.escape(str(value or ""), quote=True)
    output = [
        "<!DOCTYPE html>",
        '<html lang="ko"><head><meta charset="UTF-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        "<title>톡톡 예매 좌석 배치도</title>",
        """<style>
        :root { color-scheme: light; } body { margin: 0; padding: 28px; background: #f4f4f9; color: #273444; font-family: Pretendard, "Malgun Gothic", sans-serif; text-align: center; }
        .stage { width: min(680px, 80vw); margin: 0 auto 32px; padding: 14px; border-radius: 0 0 70px 70px; background: #273444; color: #fff; font-size: 22px; font-weight: 800; letter-spacing: .35em; }
        .summary { margin: 0 auto 24px; color: #5c6b7a; font-size: 15px; } .zone-container { width: fit-content; min-width: min(900px, 94vw); margin: 0 auto 36px; padding: 24px; overflow-x: auto; border-radius: 16px; background: #fff; box-shadow: 0 8px 24px #27344412; }
        .zone-title { margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #edf0f3; font-size: 21px; font-weight: 800; } .seat-grid { display: flex; justify-content: center; align-items: flex-start; gap: 42px; }
        .section-col { display: flex; flex-direction: column; gap: 7px; align-items: center; } .section-title { margin-bottom: 5px; color: #64748b; font-size: 14px; font-weight: 700; }
        .row { display: flex; align-items: center; gap: 5px; } .row-label { width: 24px; color: #94a3b8; font-size: 12px; font-weight: 700; text-align: right; }
        .seat { width: 52px; height: 46px; border: 1px solid #dfe6e9; border-radius: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box; }
        .seat.occupied { border-color: #3498db; background: #ebf5fb; box-shadow: 0 2px 4px #3498db1a; } .seat.empty { border-style: dashed; background: #fcfcfc; opacity: .5; }
        .st-id { color: #2c3e50; font-size: 10px; font-weight: 800; line-height: 1.2; } .st-name { max-width: 48px; overflow: hidden; color: #555; font-size: 10px; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
        @media (max-width: 720px) { body { padding: 16px 8px; } .zone-container { min-width: 860px; padding: 18px; } .seat-grid { gap: 24px; } }
        </style></head><body>",
        '<div class="stage">STAGE</div>',
        f'<div class="summary">확정 예매 {len(bookings)}건 · 예매 좌석 {occupied_count}석 · 생성 시각 {esc(pd_timestamp())}</div>',
    ]

    for zone, settings in ZONE_SETTINGS.items():
        zone_data = all_data[zone]
        output.append(f'<section class="zone-container"><div class="zone-title">{esc(zone)}</div><div class="seat-grid">')
        for section in ("L", "C", "R"):
            rows = zone_data.get(section, {})
            output.append(f'<div class="section-col"><div class="section-title">{SECTION_NAMES[section]}</div>')
            for row in range(1, settings["rows"] + 1):
                seat_map = {seat["num"]: seat for seat in rows.get(row, [])}
                output.append(f'<div class="row"><div class="row-label">{row}</div>')
                for number in range(1, SECTION_COUNTS[section] + 1):
                    seat = seat_map.get(number)
                    if seat:
                        output.append(
                            f'<div class="seat occupied" title="좌석 {esc(seat["id"])} · 예매 #{esc(seat["booking_id"])}">'
                            f'<span class="st-id">{esc(seat["student_id"])}</span><span class="st-name">{esc(seat["name"])}</span></div>'
                        )
                    else:
                        output.append('<div class="seat empty" aria-label="빈 좌석"></div>')
                output.append("</div>")
            output.append("</div>")
        output.append("</div></section>")
    output.append("</body></html>")
    return "\n".join(output)


def pd_timestamp() -> str:
    from datetime import datetime
    return datetime.now().astimezone().strftime("%Y-%m-%d %H:%M:%S %Z")


def main() -> None:
    output_path = Path(__file__).resolve().parent / OUTPUT_FILENAME
    bookings = load_confirmed_bookings()
    all_data = structure_bookings(bookings)
    output_path.write_text(create_fixed_layout_html(all_data, bookings), encoding="utf-8")
    print(f"✅ DB에서 확정 예매 {len(bookings)}건을 읽었습니다.")
    print(f"✅ 예매 좌석 {sum(len(seats) for zone in all_data.values() for rows in zone.values() for seats in rows.values())}석을 시각화했습니다.")
    print(f"💾 HTML 위치: {output_path}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"❌ 오류 발생: {error}")
        raise SystemExit(1)
