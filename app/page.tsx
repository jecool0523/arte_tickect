import HomeScreen from "@/components/home-screen"
import { getLiveMusicals } from "@/lib/server/performances"
export const dynamic = "force-dynamic"

export default async function HomePage() {
  return <HomeScreen musicals={await getLiveMusicals()} />
}
