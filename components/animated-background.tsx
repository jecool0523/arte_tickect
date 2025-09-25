import type React from "react"

const AnimatedBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden -z-10">
      {/* Abstract shapes */}
      <div className="absolute top-1/4 left-1/4 w-48 h-12 bg-gradient-to-br from-purple-800 to-pink-800 rounded-full opacity-30 animate-float-1 blur-md"></div>
      <div className="absolute top-1/2 right-1/4 w-64 h-16 bg-gradient-to-br from-blue-800 to-cyan-800 rounded-full opacity-30 animate-float-2 blur-md"></div>
      <div className="absolute bottom-1/4 left-1/3 w-56 h-14 bg-gradient-to-br from-green-800 to-lime-800 rounded-full opacity-30 animate-float-3 blur-md"></div>
      <div className="absolute top-1/3 right-1/3 w-40 h-10 bg-gradient-to-br from-red-800 to-orange-800 rounded-full opacity-30 animate-float-4 blur-md"></div>
      <div className="absolute bottom-1/2 left-1/4 w-72 h-20 bg-gradient-to-br from-indigo-800 to-purple-800 rounded-full opacity-30 animate-float-5 blur-md"></div>
    </div>
  )
}

export default AnimatedBackground
