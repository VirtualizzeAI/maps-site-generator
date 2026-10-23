import type { NextConfig } from "next";

// A URL pública é incorporada ao JavaScript durante o build.
if (process.env.VERCEL === "1") {
  let apiUrl: URL;
  try {
    apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL?.trim() || "");
  } catch {
    throw new Error(
      "Configure NEXT_PUBLIC_API_URL na Vercel com a URL HTTPS pública do backend antes do deploy.",
    );
  }

  if (
    apiUrl.protocol !== "https:" ||
    apiUrl.hostname === "localhost" ||
    apiUrl.hostname.endsWith(".localhost") ||
    apiUrl.hostname === "[::1]" ||
    apiUrl.hostname.startsWith("127.") ||
    apiUrl.hostname === "0.0.0.0" ||
    apiUrl.username ||
    apiUrl.password ||
    apiUrl.search ||
    apiUrl.hash
  ) {
    throw new Error(
      "NEXT_PUBLIC_API_URL deve ser a URL HTTPS pública do backend, sem credenciais, query ou fragmento.",
    );
  }
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
};

export default nextConfig;
