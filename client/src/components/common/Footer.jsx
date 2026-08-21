import { Link } from 'react-router-dom'
import { Briefcase, Twitter, Linkedin, Github } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-ink text-white/80">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 font-display text-lg font-800 text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-signal text-ink">
                <Briefcase size={18} />
              </span>
              CareerHub
            </div>
            <p className="mt-3 text-sm text-white/60">
              Helping students find the jobs and internships that actually match their skills.
            </p>
            <div className="mt-4 flex gap-3">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                className="text-white/50 transition-colors hover:text-signal"
              >
                <Twitter size={18} />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="text-white/50 transition-colors hover:text-signal"
              >
                <Linkedin size={18} />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="text-white/50 transition-colors hover:text-signal"
              >
                <Github size={18} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-white">For Students</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/jobs" className="hover:text-signal">Browse Jobs</Link></li>
              <li><Link to="/internships" className="hover:text-signal">Browse Internships</Link></li>
              <li><Link to="/articles" className="hover:text-signal">Career Articles</Link></li>
              <li><Link to="/interview-questions" className="hover:text-signal">Interview Prep</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-white">For Recruiters</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/register" className="hover:text-signal">Post a Job</Link></li>
              <li><Link to="/companies" className="hover:text-signal">Browse Companies</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-white">Company</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/about" className="hover:text-signal">About</Link></li>
              <li><Link to="/contact" className="hover:text-signal">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-xs text-white/40">
          © {new Date().getFullYear()} CareerHub. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
