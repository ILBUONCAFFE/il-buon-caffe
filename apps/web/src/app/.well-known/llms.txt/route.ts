import { LLMS_HEADERS, LLMS_TXT } from "../../llms-content";

export const revalidate = 86400;

export function GET() {
  return new Response(LLMS_TXT, { headers: LLMS_HEADERS });
}
