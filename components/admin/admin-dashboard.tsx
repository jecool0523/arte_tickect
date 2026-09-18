"use client"

import { useEffect, useState } from "react"
import { CalendarDays, ChevronRight, Mail, Search, Shield, Ticket, Trash2, UserCheck, UserPlus, Users, X, Loader2, MoreHorizontal, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

type AdminUser = {
  id: string
  email: string
  display_name: string | null
  student_id: string | null
  avatar_url: string | null
  is_admin: boolean
  email_confirmed: boolean
  created_at: string
  updated_at: string
  booking_count: number
  review_count: number
}

type BookingStats = {
  dead_poets_society: { total_bookings: number; total_seats: number; unique_users: number }
  rent: { total_bookings: number; total_seats: number; unique_users: number }
  toctoc: { total_bookings: number; total_seats: number; unique_users: number }
  periods: { musical_name: string; start_time: string; end_time: string }[]
  presale_keys: {
    musical_id: string
    label: string | null
    is_active: boolean
    used_count: number
    max_uses: number | null
    max_seats_per_booking: number | null
    starts_at: string | null
    ends_at: string | null
  }[]
}

type Pagination = { total: number; limit: number; offset: number }

export default function AdminDashboard() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<string>("users")

  // Users state
  const [users, setUsers] = useState<AdminUser[]>([])
  const [userPagination, setUserPagination] = useState<Pagination>({ total: 0, limit: 20, offset: 0 })
  const [userSearch, setUserSearch] = useState("")
  const [userSearchDebounced, setUserSearchDebounced] = useState("")
  const [usersLoading, setUsersLoading] = useState(true)

  // Bookings state
  const [bookingStats, setBookingStats] = useState<BookingStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Presale state
  const [presaleLoading, setPresaleLoading] = useState(false)

  // Fetch users
  const fetchUsers = async (offset = 0, search = "") => {
    setUsersLoading(true)
    try {
      const params = new URLSearchParams({
        limit: "20",
        offset: offset.toString(),
      })
      if (search) params.set("search", search)

      const response = await fetch(`/api/admin/users?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        if (data.code === "FORBIDDEN") {
          window.location.href = "/profile?error=admin_required"
        }
        throw new Error(data.error || "Failed to fetch users")
      }

      setUsers(data.users)
      setUserPagination({ total: data.total, limit: data.limit, offset: data.offset })
    } catch (error) {
      toast({ title: "사용자 목록 조회 실패", description: error instanceof Error ? error.message : "잠시 후 다시 시도해주세요.", variant: "destructive" })
    } finally {
      setUsersLoading(false)
    }
  }

  // Fetch booking stats
  const fetchBookingStats = async () => {
    setStatsLoading(true)
    try {
      const response = await fetch("/api/admin/booking-stats")
      const data = await response.json()

      if (!response.ok) {
        if (data.code === "FORBIDDEN") window.location.href = "/profile?error=admin_required"
        throw new Error(data.error || "Failed to fetch booking stats")
      }

      setBookingStats(data.stats)
    } catch (error) {
      toast({ title: "예매 통계 조회 실패", description: error instanceof Error ? error.message : "잠시 후 다시 시도해주세요.", variant: "destructive" })
    } finally {
      setStatsLoading(false)
    }
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setUserSearchDebounced(userSearch)
      fetchUsers(0, userSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [userSearch])

  useEffect(() => {
    fetchUsers()
    fetchBookingStats()
  }, [])

  // Toggle admin status
  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    if (currentIsAdmin) {
      const confirm = window.confirm("정말로 관리자 권한을 해제하시겠습니까?")
      if (!confirm) return
    }

    try {
      const response = await fetch("/api/admin/users/admin-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId, isAdmin: !currentIsAdmin }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to toggle admin status")
      }

      toast({ title: currentIsAdmin ? "권한 해제 완료" : "관리자 지정 완료", description: currentIsAdmin ? "관리자 권한이 해제되었습니다." : "사용자가 관리자로 지정되었습니다." })
      fetchUsers(userPagination.offset, userSearchDebounced)
    } catch (error) {
      toast({ title: "권한 변경 실패", description: error instanceof Error ? error.message : "잠시 후 다시 시도해주세요.", variant: "destructive" })
    }
  }

  // Format date
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })

  const formatDateShort = (dateStr: string) => new Date(dateStr).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-purple-600" />
              <h1 className="text-xl font-bold text-slate-900">관리자 대시보드</h1>
            </div>
            <Link href="/profile" className="text-sm text-slate-600 hover:text-slate-900">
              내 프로필로 돌아가기
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users"><Users className="mr-2 h-4 w-4" />사용자 관리</TabsTrigger>
            <TabsTrigger value="bookings"><Ticket className="mr-2 h-4 w-4" />예매 현황</TabsTrigger>
            <TabsTrigger value="presale"><Ticket className="mr-2 h-4 w-4" />선예매 코드</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="이메일, 이름, 학번으로 검색..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {usersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            ) : (
              <>
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">아바타</TableHead>
                          <TableHead>사용자 정보</TableHead>
                          <TableHead className="w-32">권한</TableHead>
                          <TableHead className="w-28">이메일 인증</TableHead>
                          <TableHead className="w-28">예매 / 후기</TableHead>
                          <TableHead className="w-36">가입일</TableHead>
                          <TableHead className="w-36">액션</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                              사용자가 없습니다.
                            </TableCell>
                          </TableRow>
                        ) : (
                          users.map((user) => (
                            <TableRow key={user.id} className="hover:bg-slate-50">
                              <TableCell>
                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                                  {user.avatar_url ? (
                                    <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <span className="text-slate-500 font-medium">
                                      {user.display_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-slate-900">{user.display_name || "이름 없음"}</p>
                                  <p className="text-sm text-slate-500">{user.email}</p>
                                  {user.student_id && <p className="text-xs text-slate-400">학번: {user.student_id}</p>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={user.is_admin ? "default" : "outline"} className="capitalize">
                                  {user.is_admin ? "관리자" : "일반"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={user.email_confirmed ? "default" : "secondary"}>
                                  {user.email_confirmed ? "인증됨" : "미인증"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-slate-600">
                                <div>{user.booking_count} 예매</div>
                                <div>{user.review_count} 후기</div>
                              </TableCell>
                              <TableCell className="text-sm text-slate-500">{formatDateShort(user.created_at)}</TableCell>
                              <TableCell>
                                <Button
                                  variant={user.is_admin ? "destructive" : "default"}
                                  size="sm"
                                  onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                                  className="w-full"
                                >
                                  {user.is_admin ? "권한 해제" : "관리자 지정"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Pagination */}
                {userPagination.total > userPagination.limit && (
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchUsers(Math.max(0, userPagination.offset - userPagination.limit), userSearchDebounced)}
                      disabled={userPagination.offset === 0}
                    >
                      <ChevronRight className="h-4 w-4 rotate-180" /> 이전
                    </Button>
                    <span className="text-sm text-slate-600">
                      {userPagination.offset + 1}~{Math.min(userPagination.offset + userPagination.limit, userPagination.total)} / {userPagination.total}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchUsers(userPagination.offset + userPagination.limit, userSearchDebounced)}
                      disabled={userPagination.offset + userPagination.limit >= userPagination.total}
                    >
                      다음 <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-6">
            {statsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            ) : bookingStats ? (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { key: "dead_poets_society", title: "죽은 시인의 사회", icon: Users },
                    { key: "rent", title: "RENT", icon: Ticket },
                    { key: "toctoc", title: "TOC TOC", icon: UserPlus },
                  ].map(({ key, title, icon: Icon }) => {
                    const stat = bookingStats[key as keyof typeof bookingStats] as { total_bookings: number; total_seats: number; unique_users: number }
                    return (
                      <Card key={key}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Icon className="h-5 w-5 text-purple-600" />
                            {title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="rounded-lg bg-slate-50 p-3">
                              <p className="text-2xl font-bold text-slate-900">{stat.total_bookings}</p>
                              <p className="text-xs text-slate-500">총 예매 건수</p>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-3">
                              <p className="text-2xl font-bold text-slate-900">{stat.total_seats}</p>
                              <p className="text-xs text-slate-500">총 좌석 수</p>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-3">
                              <p className="text-2xl font-bold text-slate-900">{stat.unique_users}</p>
                              <p className="text-xs text-slate-500">예매자 수</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                {/* Booking Periods */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5" />
                      예매 기간 설정
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>공연</TableHead>
                          <TableHead>시작일시</TableHead>
                          <TableHead>종료일시</TableHead>
                          <TableHead className="w-36">상태</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bookingStats.periods.map((period: { musical_name: string; start_time: string; end_time: string }) => (
                          <TableRow key={period.musical_name}>
                            <TableCell className="font-medium">{period.musical_name}</TableCell>
                            <TableCell>{formatDate(period.start_time)}</TableCell>
                            <TableCell>{formatDate(period.end_time)}</TableCell>
                            <TableCell>
                              <Badge variant={new Date(period.end_time) > new Date() ? "default" : "secondary"}>
                                {new Date(period.end_time) > new Date() ? "진행 중" : "종료"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </TabsContent>

          {/* Presale Keys Tab */}
          <TabsContent value="presale" className="space-y-6">
            {presaleLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            ) : bookingStats ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ticket className="h-5 w-5" />
                    선예매 코드 현황
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>공연</TableHead>
                        <TableHead>라벨</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>사용/최대</TableHead>
                        <TableHead>최대 좌석/예매</TableHead>
                        <TableHead>시작일시</TableHead>
                        <TableHead>종료일시</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookingStats.presale_keys.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                            등록된 선예매 코드가 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        bookingStats.presale_keys.map((key: { musical_id: string; label: string | null; is_active: boolean; used_count: number; max_uses: number | null; max_seats_per_booking: number | null; starts_at: string | null; ends_at: string | null }) => (
                          <TableRow key={`${key.musical_id}-${key.label}`}>
                            <TableCell className="font-medium">{key.musical_id}</TableCell>
                            <TableCell>{key.label || "라벨 없음"}</TableCell>
                            <TableCell>
                              <Badge variant={key.is_active ? "default" : "secondary"}>
                                {key.is_active ? "활성" : "비활성"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {key.used_count} / {key.max_uses ?? "무제한"}
                            </TableCell>
                            <TableCell>{key.max_seats_per_booking ?? "제한 없음"}</TableCell>
                            <TableCell>{key.starts_at ? formatDate(key.starts_at) : "제한 없음"}</TableCell>
                            <TableCell>{key.ends_at ? formatDate(key.ends_at) : "제한 없음"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}