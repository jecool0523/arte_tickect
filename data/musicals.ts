import type { MusicalInfo } from "@/types/musical"

export const musicals: Record<string, MusicalInfo> = {
  rent: {
    id: "rent",
    title: "< RENT >",
    subtitle: "Musical Rent",
    genre: "{ 락 뮤지컬 }",
    special: "{ 감동적인 스토리! }",
    runtime: "약 1시간 10분",
    ageRating: "{ 전부! }",
    venue: "신관 4층 강당",
    date: "2025년 12월 23일! (화)",
    time: "방과후 시간",
    posterImage: "/rent-poster.png",
    cast: [
      {
        name: "로저",
        actor: "곽승현",
        intro:
          "에이즈로 애인을 잃은 슬픔에 방황하며 사랑을 믿지 않는 음악가. HIV 양성반응자이며, 자신이 죽기 전에 의미 있는 곡을 쓰고 싶어 한다. ",
        image: "/3.png",
      },
      {
        name: "미미",
        actor: "전소현",
        intro: "AIDS에 약물 중독인 클럽 댄서. 생이 얼마 남지 않았기 때문에 뜨거운 사랑이 더욱 소중하다고 생각한다.",
        image: "/2.png",
      },
      {
        name: "마크",
        actor: "김승현",
        intro: "영화 제작자이자 비디오 아티스트이며 로저의 절친한 친구. 친구들의 사랑과 죽음을 모두 목격하는 인물이다.",
        image: "/1.png",
      },
      {
        name: "모린",
        actor: "김보경",
        intro: "행위예술가이자 마크의 전 애인. 아름다운 외모와 자유분방한 성격으로 항상 애인들을 긴장시킨다.",
        image: "/4.png",
      },
      {
        name: "엔젤",
        actor: "오건우",
        intro: "드랙퀸이자 거리의 드러머. HIV 양성반응자이며, 모두에게 사랑을 깨우쳐주는 인물.",
        image: "/5.png",
      },
      {
        name: "콜린",
        actor: "조경윤",
        intro: "HIV 양성반응자. 컴퓨터 천재 엔젤과의 연애를 통해 진정한 사랑이 무엇인지 보여주는 인물.",
        image: "/6.png",
      },
      {
        name: "조앤",
        actor: "박소은",
        intro: "공익변호사이자 모린의 연인. 신중하고 꼼꼼한 성격으로, 정반대의 성격을 가진 모린과 항상 티격태격한다.",
        image: "/7.png",
      },
      {
        name: "베니",
        actor: "구민찬",
        intro:
          "마크와 로저의 친구였지만 부자 아내와 결혼하고 건물주가 되었다. 거리의 부랑자들을 내몰고 멀티미디어 스튜디오를 운영하고 싶어 하여 친구들에게 지탄받지만, 마음 한 켠은 아직도 친구들의 자유로운 생활을 동경한다.",
        image: "/8.png",
      },
      {
        name: "앙상블",
        actor: "조민서",
        intro: "무대를 빛내주는 앙상블!",
        image: "/9.png",
      },
      {
        name: "앙상블",
        actor: "변제규",
        intro: "무대를 빛내주는 앙상블!",
        image: "/10.png",
      },
      {
        name: "앙상블",
        actor: "김아린",
        intro: "무대를 빛내주는 앙상블!",
        image: "/11.png",
      },
      {
        name: "앙상블",
        actor: "김지오",
        intro: "무대를 빛내주는 앙상블!",
        image: "/12.png",
      },
    ],
    synopsis: `1989년 12월 24일, 뉴욕 이스트빌리지. 영화감독을 꿈꾸는 마크와 음악가 로저는 오래된 아파트 다락방에서 난방도 끊긴 채 새해를 맞는다. 그들의 친구였던 베니는 부잣집 딸과 결혼 후 건물주가 되어 로저와 마크에게 월세를 독촉한다.
    과거 연인 에이프릴의 죽음 이후 로저는 세상에 남길 단 한 곡의 노래를 찾으며 고독하게 살아간다. 그런 그의 앞에 댄서 미미가 나타나고, 얼어붙은 마음은 조금씩 흔들리기 시작한다.
    퍼포먼스 아티스트 모린과 그녀의 연인 조앤, 그리고 자유로운 영혼 엔젤과 철학적인 콜린스까지.
    이들은 각자의 방식으로 세상에 맞서고, 서로에게 기대며 하루하루를 버틴다. 가난과 병, 불안, 그리고 사랑 속에서.`,
    highlights: ["브로드웨이 명작", "감동적인 음악", "현실적인 스토리", "청춘의 아름다움"],
    seatGrades: [
      { grade: "VIP", description: "1층 앞블럭 최고급 좌석", color: "bg-yellow-100 border-yellow-300" },
      { grade: "R석", description: "1층 뒷블럭 우수 좌석", color: "bg-red-100 border-red-300" },
      { grade: "S석", description: "2층 전체 일반 좌석", color: "bg-blue-100 border-blue-300" },
    ],
  },

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
}

// 뮤지컬 ID로 정보를 가져오는 헬퍼 함수
export function getMusicalById(id: string): MusicalInfo | null {
  return musicals[id] || null
}

// 모든 뮤지컬 목록을 가져오는 헬퍼 함수
export function getAllMusicals(): MusicalInfo[] {
  return Object.values(musicals)
}
