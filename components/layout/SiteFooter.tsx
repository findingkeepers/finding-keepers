import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-fk-gold/20 bg-fk-plum-deep text-fk-cream">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-3 md:px-10">
        <div>
          <p className="font-title text-2xl text-fk-gold-light">Finding Keepers</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-fk-cream/80">
            A verified Muslim matrimonial programme for HKID holders in Hong Kong,
            facilitated by Serving Islam Team and Connect Institute.
          </p>
        </div>

        <div>
          <p className="fk-eyebrow mb-4 text-fk-gold-light">Programme</p>
          <ul className="space-y-2 text-sm text-fk-cream/85">
            <li>
              <Link href="/register" className="hover:text-fk-gold-light">
                Register
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-fk-gold-light">
                Login
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="hover:text-fk-gold-light">
                Dashboard
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="fk-eyebrow mb-4 text-fk-gold-light">Contact</p>
          <ul className="space-y-2 text-sm text-fk-cream/85">
            <li>
              <a
                href="mailto:findingkeepers@connecthk.org"
                className="hover:text-fk-gold-light"
              >
                findingkeepers@connecthk.org
              </a>
            </li>
            <li className="text-fk-cream/65">Hong Kong</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-fk-cream/10 px-6 py-5 text-center text-xs text-fk-cream/55 md:px-10">
        © {new Date().getFullYear()} Finding Keepers · Serving Islam Team & Connect Institute
      </div>
    </footer>
  );
}