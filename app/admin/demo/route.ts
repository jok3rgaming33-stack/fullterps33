import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import crypto from "crypto"

export async function GET() {
  // Demo route to bypass admin password for testing only
  // Remove in production
  const SECRET = process.env.SESSION_SECRET || "dev-secret-change-me-in-production"
  const ADMIN_COOKIE = "ft33_admin"
  
  function sign(value: string): string {
    const mac = crypto.createHmac("sha256", SECRET).update(value).digest("hex")
    return `${value}.${mac}`
  }
  
  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE, sign("admin"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4,
  })
  
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"
  return NextResponse.redirect(new URL("/admin", baseUrl))
}
