
// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    console.log(`POST /api/auth/login - User: ${username}`);

    // TODO: Implement actual authentication logic here
    // For now, return a mock success response if username is "admin"
    if (username === "admin" && password === "password") {
      return NextResponse.json({
        token: "mock_jwt_token_12345",
        user: { id: "user_admin_demo", name: "Admin User" }
      });
    } else {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
  } catch (error) {
    console.error("Error in /api/auth/login:", error);
    return NextResponse.json({ error: "Failed to process login request." }, { status: 500 });
  }
}
