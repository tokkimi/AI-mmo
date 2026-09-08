import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'AI IMMO — L’académie des courtiers de demain',description:'Formation en intelligence artificielle et marketing immobilier au Québec. Parcours guidés, prompts ChatGPT, exercices et accompagnement.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="fr-CA"><body>{children}</body></html>}
