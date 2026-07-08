"use client"

import { useEffect, useState } from "react"
import { Bell } from "lucide-react"
import { getThreadsForToken } from "@/app/actions/messaging"
import { MessagerieModal } from "@/components/messagerie-modal"

type UserData = { pseudo?: string; token?: string } | null

type Props = { userData: UserData }

export function NotificationBell({ userData }: Props) {
  const token = userData?.token ?? ""
  const [unread, setUnread]   = useState(0)
  const [open, setOpen]       = useState(false)

  useEffect(() => {
    if (!token) return
    const check = async () => {
      try {
        const threads = await getThreadsForToken(token)
        setUnread(threads.reduce((sum, t) => sum + (t.unreadClient ?? 0), 0))
      } catch { /* silencieux */ }
    }
    check()
    const id = setInterval(check, 15000)
    return () => clearInterval(id)
  }, [token])

  if (!token) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative text-ivory/70 transition hover:text-violet-electric"
        aria-label={unread > 0 ? `${unread} message(s) non lu(s)` : "Messagerie"}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span
            className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-violet-electric font-mono text-[9px] font-bold text-void"
            aria-hidden="true"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <MessagerieModal
        isOpen={open}
        onClose={() => setOpen(false)}
        userData={userData}
      />
    </>
  )
}
