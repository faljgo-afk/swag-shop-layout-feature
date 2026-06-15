import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50">
      <img src="/logo Black.png" alt="Swag42" className="h-10 w-auto" />
      <p className="text-gray-500 text-xl font-bold">Swag Shop Layout &amp; Design</p>
      <div className="flex gap-4">
        <Link href="/admin" className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          Swag Shop Admin
        </Link>
        <Link href="/shop" className="px-6 py-3 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors">
          View Swag Shop
        </Link>
      </div>
    </div>
  )
}
