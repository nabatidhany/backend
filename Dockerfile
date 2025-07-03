# Gunakan image resmi Bun
FROM oven/bun:1.1

# Buat direktori kerja
WORKDIR /app

# Salin file project
COPY . .

# Install dependencies
RUN bun install

# Jalankan aplikasi
CMD ["bun", "run", "src/index.ts"]
