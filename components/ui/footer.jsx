import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
   <div className="bg-zinc-950"> <footer className="w-full border-t border-zinc-800/50 bg-zinc-950 pt-16 pb-8 relative z-30 px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 md:col-span-4 lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-6 h-6 flex items-center justify-center">
                <Image src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/logo1.svg`} alt="Logo" width={20} height={20} />
              </div>
              <span className="font-bold text-lg tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400">Geiger Studios</span>
            </div>
            <p className="text-zinc-500 text-sm max-w-sm">
              Built to Manage. Designed to Create.
              <br /> Turn your ideas into something real with a single suite that combines solid management tools and easy-to-use creative features.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold text-zinc-100 mb-4">Products</h4>
            <ul className="space-y-3">
              <li><Link href="/flow" className="hover:text-zinc-100 transition-colors text-zinc-400 text-sm">Geiger Flow</Link></li>
              <li><Link href="#" className="hover:text-zinc-100 transition-colors text-zinc-400 text-sm">Geiger Notes</Link></li>
              <li><Link href="#" className="hover:text-zinc-100 transition-colors text-zinc-400 text-sm">Geiger DAM</Link></li>
              <li><Link href="#" className="hover:text-zinc-100 transition-colors text-zinc-400 text-sm">Geiger Grey</Link></li>
              <li><Link href="#" className="hover:text-zinc-100 transition-colors text-zinc-400 text-sm">Geiger Enterprise</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-zinc-100 mb-4">Resources</h4>
            <ul className="flex flex-col gap-3 text-sm text-zinc-400">
              <li><Link href="/docs" className="hover:text-zinc-100 transition-colors">Documentation</Link></li>
              <li><Link href="#" className="hover:text-zinc-100 transition-colors">Help Center</Link></li>
              <li><Link href="#" className="hover:text-zinc-100 transition-colors">Community</Link></li>
              <li><Link href="#" className="hover:text-zinc-100 transition-colors">Contact Support</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-zinc-100 mb-4">Company</h4>
            <ul className="flex flex-col gap-3 text-sm text-zinc-400">
              <li><Link href="#" className="hover:text-zinc-100 transition-colors">About</Link></li>
              <li><Link href="/blog" className="hover:text-zinc-100 transition-colors">Blog</Link></li>
              <li><Link href="#" className="hover:text-zinc-100 transition-colors">Careers</Link></li>
              <li><Link href="#" className="hover:text-zinc-100 transition-colors">Legal</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-zinc-800/50 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <p>&copy; {new Date().getFullYear()} Geiger Studios. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="#" className="hover:text-zinc-300 transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-zinc-300 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
    <div className="mt-10 flex justify-center bg-zinc-950 relative z-0"><h1 className="text-[13vw] font-bold text-zinc-100/5 dark:text-white/5 leading-none tracking-tighter select-none pointer-events-none">GEIGER STUDIO</h1></div>
    </div>
  );
}
