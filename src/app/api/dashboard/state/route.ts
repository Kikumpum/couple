import { NextRequest, NextResponse } from "next/server";
import { initialPeriodSettings, initialSavingsGoals } from "@/lib/dashboard-data";
import { prisma } from "@/lib/prisma";

type DashboardStatePayload = {
  savingsGoals?: unknown;
  jajanExpenses?: unknown;
  periodSettings?: unknown;
  journalText?: unknown;
};

const dashboardStateKey = process.env.DASHBOARD_STATE_KEY ?? "az-shared";

function fallbackState() {
  return {
    exists: false,
    savingsGoals: initialSavingsGoals,
    jajanExpenses: [],
    periodSettings: initialPeriodSettings,
    journalText: ""
  };
}

function jsonArray(value: unknown, fallback: unknown[]) {
  return Array.isArray(value) ? value : fallback;
}

function jsonObject(value: unknown, fallback: object) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : fallback;
}

export async function GET() {
  try {
    const state = await prisma.dashboardState.findUnique({
      where: { key: dashboardStateKey }
    });

    if (!state) {
      return NextResponse.json(fallbackState(), {
        headers: { "Cache-Control": "no-store" }
      });
    }

    return NextResponse.json(
      {
        exists: true,
        savingsGoals: state.savingsGoals,
        jajanExpenses: state.jajanExpenses,
        periodSettings: state.periodSettings ?? initialPeriodSettings,
        journalText: state.journalText ?? "",
        updatedAt: state.updatedAt.toISOString()
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      {
        ...fallbackState(),
        status: "error",
        message: "Dashboard database belum siap atau tidak bisa diakses."
      },
      { headers: { "Cache-Control": "no-store" }, status: 200 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as DashboardStatePayload;
    const savingsGoals = jsonArray(body.savingsGoals, initialSavingsGoals);
    const jajanExpenses = jsonArray(body.jajanExpenses, []);
    const periodSettings = jsonObject(body.periodSettings, initialPeriodSettings);
    const journalText =
      typeof body.journalText === "string" ? body.journalText.slice(0, 20000) : "";

    const state = await prisma.dashboardState.upsert({
      where: { key: dashboardStateKey },
      create: {
        key: dashboardStateKey,
        savingsGoals,
        jajanExpenses,
        periodSettings,
        journalText
      },
      update: {
        savingsGoals,
        jajanExpenses,
        periodSettings,
        journalText
      }
    });

    return NextResponse.json(
      {
        ok: true,
        updatedAt: state.updatedAt.toISOString()
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "Dashboard state gagal disimpan."
      },
      { headers: { "Cache-Control": "no-store" }, status: 200 }
    );
  }
}
