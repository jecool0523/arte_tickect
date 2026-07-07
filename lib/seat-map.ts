import { FLOOR_1, FLOOR_2, GRADE_R, GRADE_S, GRADE_VIP, type SeatFloor, type SeatGradeCode } from "@/lib/musical-config"

export type SeatArea = "L" | "C" | "R"

export type SeatSection = {
  id: string
  floor: SeatFloor
  grade: SeatGradeCode
  title: string
  rowStart: number
  rowCount: number
}

export type SeatCell = {
  id: string
  floor: SeatFloor
  grade: SeatGradeCode
  row: number
  area: SeatArea
  seatNumber: number
  label: string
}

export const FLOOR_OPTIONS = [
  { id: FLOOR_1, label: "1층" },
  { id: FLOOR_2, label: "2층" },
] as const

export const SEAT_AREAS: Array<{ id: SeatArea; label: string; seats: number }> = [
  { id: "L", label: "왼쪽", seats: 6 },
  { id: "C", label: "중앙", seats: 12 },
  { id: "R", label: "오른쪽", seats: 6 },
]

export const SEAT_SECTIONS: SeatSection[] = [
  {
    id: "vip-front",
    floor: FLOOR_1,
    grade: GRADE_VIP,
    title: "VIP 앞블록",
    rowStart: 1,
    rowCount: 9,
  },
  {
    id: "r-rear",
    floor: FLOOR_1,
    grade: GRADE_R,
    title: "R석 뒷블록",
    rowStart: 1,
    rowCount: 8,
  },
  {
    id: "s-second-floor",
    floor: FLOOR_2,
    grade: GRADE_S,
    title: "S석 전체",
    rowStart: 1,
    rowCount: 8,
  },
]

const floorIdPrefix: Record<SeatFloor, string> = {
  [FLOOR_1]: "F1",
  [FLOOR_2]: "F2",
}

const floorLabelByPrefix: Record<string, SeatFloor> = {
  F1: FLOOR_1,
  F2: FLOOR_2,
}

const gradeIdPrefix: Record<SeatGradeCode, string> = {
  [GRADE_VIP]: "VIP",
  [GRADE_R]: "R",
  [GRADE_S]: "S",
}

const gradeLabelByPrefix: Record<string, SeatGradeCode> = {
  VIP: GRADE_VIP,
  R: GRADE_R,
  S: GRADE_S,
}

const areaLabelById: Record<SeatArea, string> = {
  L: "왼쪽",
  C: "중앙",
  R: "오른쪽",
}

function padNumber(value: number) {
  return value.toString().padStart(2, "0")
}

export function createSeatId(floor: SeatFloor, grade: SeatGradeCode, row: number, area: SeatArea, seatNumber: number) {
  return `${floorIdPrefix[floor]}-${gradeIdPrefix[grade]}-R${padNumber(row)}-${area}${padNumber(seatNumber)}`
}

export function createSeatCell(section: SeatSection, row: number, area: SeatArea, seatNumber: number): SeatCell {
  const id = createSeatId(section.floor, section.grade, row, area, seatNumber)

  return {
    id,
    floor: section.floor,
    grade: section.grade,
    row,
    area,
    seatNumber,
    label: `${section.floor} ${section.grade} ${row}열 ${areaLabelById[area]} ${seatNumber}번`,
  }
}

export function getSeatSectionsByFloor(floor: SeatFloor) {
  return SEAT_SECTIONS.filter((section) => section.floor === floor)
}

export function getSeatRows(section: SeatSection) {
  return Array.from({ length: section.rowCount }, (_, rowIndex) => {
    const row = section.rowStart + rowIndex
    const areas = SEAT_AREAS.map((area) => ({
      area,
      seats: Array.from({ length: area.seats }, (_, seatIndex) =>
        createSeatCell(section, row, area.id, seatIndex + 1),
      ),
    }))

    return { row, areas }
  })
}

export function parseSeatId(seatId: string): SeatCell | null {
  const match = seatId.match(/^(F[12])-(VIP|R|S)-R(\d{2})-([LCR])(\d{2})$/)
  if (!match) return null

  const [, floorPrefix, gradePrefix, rowValue, areaValue, seatValue] = match
  const floor = floorLabelByPrefix[floorPrefix]
  const grade = gradeLabelByPrefix[gradePrefix]
  const area = areaValue as SeatArea
  const row = Number(rowValue)
  const seatNumber = Number(seatValue)

  if (!floor || !grade || !area || !row || !seatNumber) return null

  return {
    id: seatId,
    floor,
    grade,
    row,
    area,
    seatNumber,
    label: `${floor} ${grade} ${row}열 ${areaLabelById[area]} ${seatNumber}번`,
  }
}

export function getSeatDisplayLabel(seatId: string) {
  return parseSeatId(seatId)?.label ?? seatId
}
