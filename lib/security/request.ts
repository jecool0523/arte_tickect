import { z } from "zod"

export class RequestBodyError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message)
  }
}

export async function readJsonBody<T>(request: Request, schema: z.ZodType<T>, maxBytes = 16_384): Promise<T> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0)
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RequestBodyError("Request body is too large.", 413)
  }

  const reader = request.body?.getReader()
  if (!reader) throw new RequestBodyError("Request body is required.")

  const decoder = new TextDecoder()
  let text = ""
  let bytes = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    bytes += value.byteLength
    if (bytes > maxBytes) {
      await reader.cancel()
      throw new RequestBodyError("Request body is too large.", 413)
    }
    text += decoder.decode(value, { stream: true })
  }
  text += decoder.decode()

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new RequestBodyError("Request body must be valid JSON.")
  }

  const result = schema.safeParse(parsed)
  if (!result.success) throw new RequestBodyError("Request body contains invalid fields.")
  return result.data
}
