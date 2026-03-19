type OrganicIconProps = {
  icon: React.ElementType
  bgColor: string
  iconColor: string
  size?: 'sm' | 'md' | 'lg'
}

export const OrganicIcon = ({ icon: Icon, bgColor, iconColor, size = 'md' }: OrganicIconProps) => {
  const sizeClasses = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12' }
  const iconSizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' }

  return (
    <div className={`flex items-center justify-center rounded-2xl ${sizeClasses[size]} ${bgColor}`}>
      <Icon className={`${iconSizes[size]} ${iconColor} stroke-[1.5px]`} />
    </div>
  )
}
