import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code = "BAD_REQUEST",
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export class NotFoundError extends ApiError {
  constructor(entity: string) {
    super(`${entity} not found`, 404, "NOT_FOUND");
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: error.flatten(),
        },
      },
      { status: 400 },
    );
  }

  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.status },
    );
  }

  console.error("[ornaments] Unexpected error", error);

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected ornament catalog error",
      },
    },
    { status: 500 },
  );
}

export async function parseJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new ApiError("Invalid JSON body", 400, "INVALID_JSON");
  }
}

export async function parseOptionalJsonBody(request: Request) {
  const text = await request.text();

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError("Invalid JSON body", 400, "INVALID_JSON");
  }
}
