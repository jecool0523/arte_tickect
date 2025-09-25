export interface CastMember {
  name: string
  actor: string
  intro: string
  image?: string
}

export interface MusicalInfo {
  id: string
  title: string
  subtitle: string
  genre: string
  special: string
  runtime: string
  ageRating: string
  venue: string
  date: string
  time: string
  cast: CastMember[]
  synopsis: string
  highlights: string[]
  posterImage: string
  seatGrades: SeatGrade[]
}

export interface SeatGrade {
  grade: string
  description: string
  color: string
}
