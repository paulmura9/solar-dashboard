import {
  SIGNED_OUT_QUERY_PARAM,
  SIGNED_OUT_QUERY_VALUE,
} from "@/config/auth";
import { LoginForm } from "./LoginForm";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const raw = params[SIGNED_OUT_QUERY_PARAM];
  const justSignedOut =
    (Array.isArray(raw) ? raw[0] : raw) === SIGNED_OUT_QUERY_VALUE;

  return <LoginForm justSignedOut={justSignedOut} />;
}
