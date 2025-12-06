import Image from 'next/image'
import Link from 'next/link'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  href?: string
}

export function Logo({ size = 'md', showText = true, href = '/' }: LogoProps) {
  const sizes = {
    sm: { width: 32, height: 32, textSize: 'text-lg' },
    md: { width: 40, height: 40, textSize: 'text-2xl' },
    lg: { width: 56, height: 56, textSize: 'text-3xl' }
  }

  const { width, height, textSize } = sizes[size]

  const LogoContent = () => (
    <div className="flex items-center gap-3">
      <Image
        src="/logo.png"
        alt="PasarSuara Pintar Logo"
        width={width}
        height={height}
        className="object-contain"
        priority
      />
      {showText && (
        <span className={`font-bold text-green-700 ${textSize}`}>
          PasarSuara
        </span>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="hover:opacity-80 transition-opacity">
        <LogoContent />
      </Link>
    )
  }

  return <LogoContent />
}
