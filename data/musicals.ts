import type { MusicalInfo } from "@/types/musical"

export const musicals: Record<string, MusicalInfo> = {
  rent: {
    id: "rent",
    title: "< RENT >",
    subtitle: "Musical Rent",
    genre: "{ 뮤지컬 }",
    special: "{ 사랑과 청춘의 이야기 }",
    runtime: "약 1시간 10분",
    ageRating: "전체 관람가",
    venue: "선경관 4층 강당",
    date: "2025년 12월 23일",
    time: "방과 후",
    posterImage: "/rent-poster.png",
    cast: [
      {
        name: "로저",
        actor: "곽승현",
        intro: "상처를 품고 살아가지만 다시 노래와 사랑을 향해 나아가는 음악가.",
        image: "/3.png",
      },
      {
        name: "미미",
        actor: "안소현",
        intro: "불안한 현실 속에서도 뜨겁게 사랑하고 춤추는 인물.",
        image: "/2.png",
      },
      {
        name: "마크",
        actor: "김동현",
        intro: "친구들의 삶과 사랑을 카메라에 담는 영화 제작자.",
        image: "/1.png",
      },
      {
        name: "모린",
        actor: "김보경",
        intro: "자유분방한 에너지로 무대를 흔드는 퍼포먼스 아티스트.",
        image: "/4.png",
      },
      {
        name: "엔젤",
        actor: "서건우",
        intro: "모두에게 따뜻함과 용기를 건네는 밝은 영혼.",
        image: "/5.png",
      },
      {
        name: "콜린",
        actor: "조경민",
        intro: "사랑을 통해 삶의 의미를 다시 발견하는 철학자.",
        image: "/6.png",
      },
      {
        name: "조앤",
        actor: "박소윤",
        intro: "원칙적이지만 사랑 앞에서는 누구보다 솔직한 변호사.",
        image: "/7.png",
      },
      {
        name: "베니",
        actor: "구민찬",
        intro: "친구들과 다른 선택을 하며 갈등을 만드는 현실적인 인물.",
        image: "/8.png",
      },
    ],
    synopsis:
      "뉴욕 이스트 빌리지를 배경으로, 가난과 불안 속에서도 예술과 사랑을 포기하지 않는 청춘들의 이야기를 그립니다. 각자의 상처를 가진 인물들이 서로를 만나며 오늘을 살아갈 힘을 찾아갑니다.",
    highlights: ["강렬한 넘버", "청춘의 에너지", "사랑과 우정", "아르떼만의 무대"],
    seatGrades: [
      { grade: "VIP", description: "1층 앞블록 중심 좌석", color: "bg-yellow-100 border-yellow-300" },
      { grade: "R석", description: "1층 뒷블록 좌석", color: "bg-red-100 border-red-300" },
      { grade: "S석", description: "2층 일반 좌석", color: "bg-blue-100 border-blue-300" },
    ],
  },

  "dead-poets-society": {
    id: "dead-poets-society",
    title: "< 죽은 시인의 사회 >",
    subtitle: "Dead Poets Society",
    genre: "{ 연극 }",
    special: "{ 방과 후 진행 }",
    runtime: "약 1시간",
    ageRating: "전체 관람가",
    venue: "선경관 4층 강당",
    date: "2025년 7월 21일",
    time: "방과 후",
    posterImage: "/new-poster.png",
    cast: [
      {
        name: "키팅",
        actor: "김동현",
        intro: "학생들에게 자기만의 목소리로 살아갈 용기를 전하는 선생님.",
        image: "/cast-member-5.png",
      },
      {
        name: "닐",
        actor: "조민재",
        intro: "무대에 대한 열망과 현실의 기대 사이에서 흔들리는 학생.",
        image: "/cast-member-6.png",
      },
      {
        name: "토드",
        actor: "안소현",
        intro: "소심하지만 친구들과 선생님을 만나며 점차 자신을 표현하게 되는 학생.",
        image: "/cast-member-3.png",
      },
      {
        name: "찰리",
        actor: "김보경",
        intro: "장난기와 추진력으로 친구들에게 활기를 불어넣는 인물.",
        image: "/cast-member-4.png",
      },
      {
        name: "카메론",
        actor: "조경민",
        intro: "규칙과 질서를 중요하게 생각하는 현실적인 학생.",
        image: "/cast-member-8.png",
      },
      {
        name: "녹스",
        actor: "박소윤",
        intro: "사랑 앞에서 서툴지만 진심을 전하려 노력하는 학생.",
        image: "/cast-member-1.png",
      },
      {
        name: "학생 주임",
        actor: "서건우",
        intro: "학교의 규율과 질서를 대표하는 인물.",
        image: "/cast-member-2.png",
      },
      {
        name: "닐의 아버지",
        actor: "김지안",
        intro: "아들의 미래를 엄격하게 통제하려 하는 보호자.",
        image: "/cast-member-7.png",
      },
    ],
    synopsis:
      "엄격한 명문고에 새로 부임한 키팅 선생님은 학생들에게 시와 예술을 통해 자기 삶을 직접 바라보는 법을 가르칩니다. 학생들은 '카르페 디엠'이라는 말과 함께 자신만의 선택을 고민하기 시작합니다.",
    highlights: ["카르페 디엠", "묵직한 성장 서사", "학생 배우들의 앙상블", "가까운 거리의 몰입감"],
    seatGrades: [
      { grade: "VIP", description: "1층 앞블록 중심 좌석", color: "bg-yellow-100 border-yellow-300" },
      { grade: "R석", description: "1층 뒷블록 좌석", color: "bg-red-100 border-red-300" },
      { grade: "S석", description: "2층 일반 좌석", color: "bg-blue-100 border-blue-300" },
    ],
  },
}

export function getMusicalById(id: string): MusicalInfo | null {
  return musicals[id] || null
}

export function getAllMusicals(): MusicalInfo[] {
  return Object.values(musicals)
}
