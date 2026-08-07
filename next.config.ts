import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    /*
     * Barrel besar: tanpa ini satu named import menarik ribuan modul ikon
     * ke bundle rute. recharts sudah dioptimalkan Next secara bawaan.
     */
    optimizePackageImports: ["@phosphor-icons/react"],
  },
};

export default nextConfig;
