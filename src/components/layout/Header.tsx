import { Menu, Hospital } from "lucide-react"

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center h-14 bg-white border-b border-gray-200 px-4 gap-3">
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2">
        <Hospital className="h-5 w-5 text-primary-600" />
        <span className="font-bold text-gray-900 text-base">CHL · Imagiologia</span>
      </div>
    </header>
  )
}
