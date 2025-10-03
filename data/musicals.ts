import type { MusicalInfo } from "@/types/musical"

export const musicals: Record<string, MusicalInfo> = {
  "dead-poets-society": {
    id: "dead-poets-society",
    title: "< 죽은 시인의 사회 >",
    subtitle: "Dead Poets Society",
    genre: "{ 연극 드라마 }",
    special: "{ 방과후 째기 가능! }",
    runtime: "약 1시간",
    ageRating: "{ 재밌는 내용 }",
    venue: "신관 4층 강당",
    date: "2025년 7월 21일 (월)",
    time: "방과후 시간",
    posterImage: "/new-poster.png",
    cast: [
      {
        name: "키팅",
        actor: "김승현",
        intro:
          "항상 세상을 넓고 창의적으로 볼 줄 알고, 그를 통해 행복하게 사는 사람. 자신의 삶의 방식을 학생들에게 가르치고자 한다.",
        image: "/cast-member-5.png",
      },
      {
        name: "앤더슨",
        actor: "조민서",
        intro:
          "미디고의 전학생으로, 부모님의 공부 압박과 비교에 자존감이 매우 낮은 캐릭터이다. 그러나 닐과 키팅선생님의 도움과 가르침으로 점점 자신의 의견을 표현할 수 있게된다.",
        image: "/cast-member-6.png",
      },
      {
        name: "닐",
        actor: "전소현",
        intro:
          "미디고의 우등생, 뮤지컬과 방송부 활동에 관심이 많고, 재능이 있지만 선생님이자 아버지인 맥컬리스터의 강요에 따라 살아간다.",
        image: "/cast-member-3.png",
      },
      {
        name: "찰리",
        actor: "김보경",
        intro:
          "미디고 학생이자 닐의 친구. 정이 많고 장난끼가 많음. 키팅 선생을 매우 좋아하고 잘 따름. 살짝 울하는 성격이 있음",
        image: "/cast-member-4.png",
      },
      {
        name: "카메론",
        actor: "조경윤",
        intro:
          "항상 공부를 생각하는 모범생. 엄격한 규칙주의자. 공부를 잘하고 싶다는 욕망. 그는 가끔씩 친구들과 일탈은 즐기는 사람이다. 키팅의 수업 방식을 잘 이해를 못하는 비성숙한 면모도 보여짐",
        image: "/cast-member-8.png",
      },
      {
        name: "녹스",
        actor: "박소은",
        intro:
          "미디고의 모범생 중 하나. 어느날, 이상형의 그를 보고 한눈에 반한다. 하지만 첫사랑인 그에게는 이미 여자친구가 있다는 것을 알게되고 자신의 사랑에 대해 깊은 고민에 빠진다.",
        image: "/cast-member-1.png",
      },
      {
        name: "학생 주임",
        actor: "오건우",
        intro:
          "학교의 학생 주임, 정해진 길이 아닌 자신만의 길을 가는 친구들을 부러워하지만,그들이 망한것을 보고 결국 정해진 뜻을 따르는것이 무조건 정답이다 생각하는 인간",
        image: "/cast-member-2.png",
      },
      {
        name: "앤더슨 아버지",
        actor: "김지오",
        intro:
          "앤더슨이 죽은 시인의 사회라는 모임에 어울리는 것을 싫어한다. 앤더슨이 모임에서 탈퇴하도록 교장과 함께 부추긴다.",
        image: "/cast-member-7.png",
      },
    ],
    synopsis: `엄격한 학교 '미디어 디지털 고등학교' 그 학교에 키팅 선생님이 오게되고, 그의 교육으로 학생들은 변해가는데...`,
    highlights: ["아르떼의 역작", "디미고 단독 공연", "교내 최고 캐스팅", "교훈있는 내용"],
    seatGrades: [
      { grade: "VIP", description: "1층 앞블럭 최고급 좌석", color: "bg-yellow-100 border-yellow-300" },
      { grade: "R석", description: "1층 뒷블럭 우수 좌석", color: "bg-red-100 border-red-300" },
      { grade: "S석", description: "2층 전체 일반 좌석", color: "bg-blue-100 border-blue-300" },
    ],
  },

  rent: {
    id: "rent",
    title: "< RENT >",
    subtitle: "Rent Musical",
    genre: "{ 뮤지컬 드라마 }",
    special: "{ 감동적인 스토리! }",
    runtime: "약 2시간",
    ageRating: "{ 청소년 관람가 }",
    venue: "신관 4층 강당",
    date: "2025년 12월 14일 (금) (예정)",
    time: "방과후 1~2타임",
    posterImage: "/rent_poster_re.png",
    cast: [
      {
        name: "로저",
        actor: "곽승현",
        intro: "HIV에 감염된 뮤지션으로, 사랑과 예술에 대한 열정을 가지고 있다.",
        image: "/placeholder.svg?height=96&width=96",
      },
      {
        name: "미미",
        actor: "전소현",
        intro: "댄서이자 마약 중독자로, 로저와 사랑에 빠지게 된다.",
        image: "/placeholder.svg?height=96&width=96",
      },
      {
        name: "마크",
        actor: "김승현",
        intro: "영화감독 지망생으로, 친구들의 삶을 기록하려 한다.",
        image: "/placeholder.svg?height=96&width=96",
      },
      {
        name: "모린",
        actor: "김보경",
        intro: "퍼포먼스 아티스트로, 마크의 전 여자친구이다.",
        image: "/placeholder.svg?height=96&width=96",
      },
    ],
    synopsis: `1990년대 뉴욕 이스트 빌리지를 배경으로, HIV/AIDS의 그림자 아래 살아가는 젊은 예술가들의 사랑과 우정, 그리고 삶에 대한 이야기를 그린 감동적인 뮤지컬입니다.`,
    highlights: ["브로드웨이 명작", "감동적인 음악", "현실적인 스토리", "청춘의 아름다움"],
    seatGrades: [
      { grade: "VIP", description: "1층 앞블럭 최고급 좌석", color: "bg-yellow-100 border-yellow-300" },
      { grade: "R석", description: "1층 뒷블럭 우수 좌석", color: "bg-red-100 border-red-300" },
      { grade: "S석", description: "2층 전체 일반 좌석", color: "bg-blue-100 border-blue-300" },
    ],
  },

  "your-lie-in-april": {
    id: "your-lie-in-april",
    title: "< 아르떼 : re >",
    subtitle: "ARTE in dimi",
    genre: "{ 뮤지컬 드라마 }",
    special: "{ 클래식과 함께하는 감동! }",
    runtime: "약 2시간 30분",
    ageRating: "{ 전체 관람가 }",
    venue: "어디든",
    date: "2026년 7월 (예정)",
    time: "미정",
    posterImage: "/placeholder.svg?height=594&width=420",
    cast: [
      {
        name: "아리마 코세이",
        actor: "정우진",
        intro: "피아노 신동이었지만 어머니의 죽음 후 피아노 소리를 들을 수 없게 된 소년.",
        image: "/placeholder.svg?height=96&width=96",
      },
      {
        name: "미야조노 카오리",
        actor: "한예슬",
        intro: "자유분방한 바이올리니스트로, 코세이의 삶에 새로운 색깔을 가져다준다.",
        image: "/placeholder.svg?height=96&width=96",
      },
      {
        name: "사와베 츠바키",
        actor: "김소영",
        intro: "코세이의 소꿉친구로, 그를 향한 마음을 품고 있다.",
        image: "/placeholder.svg?height=96&width=96",
      },
      {
        name: "와타리 료타",
        actor: "이동현",
        intro: "축구부 에이스이자 코세이의 친구로, 밝고 긍정적인 성격을 가지고 있다.",
        image: "/placeholder.svg?height=96&width=96",
      },
    ],
    synopsis: `피아노를 칠 수 없게 된 소년 코세이와 자유로운 바이올리니스트 카오리의 만남을 통해 음악과 사랑, 그리고 성장에 대한 아름다운 이야기를 그린 감동적인 뮤지컬입니다.`,
    highlights: ["아름다운 클래식 음악", "감동적인 스토리", "청춘 로맨스", "성장 드라마"],
    seatGrades: [
      { grade: "VIP", description: "1층 앞블럭 최고급 좌석", color: "bg-yellow-100 border-yellow-300" },
      { grade: "R석", description: "1층 뒷블럭 우수 좌석", color: "bg-red-100 border-red-300" },
      { grade: "S석", description: "2층 전체 일반 좌석", color: "bg-blue-100 border-blue-300" },
    ],
  },
}

// 뮤지컬 ID로 정보를 가져오는 헬퍼 함수
export function getMusicalById(id: string): MusicalInfo | null {
  return musicals[id] || null
}

// 모든 뮤지컬 목록을 가져오는 헬퍼 함수
export function getAllMusicals(): MusicalInfo[] {
  return Object.values(musicals)
}
