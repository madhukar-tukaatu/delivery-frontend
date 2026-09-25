import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2 } from 'lucide-react';
import '../../auth-pages.css';
export default function MerchantRegistrationSubmittedPage() {
  return <main className="auth-page auth-recovery" style={{minHeight:'100dvh',display:'grid',placeItems:'center'}}><div className="auth-form-card" style={{background:'#fff',padding:36,borderRadius:24,border:'1px solid #dbe7ee'}}>
    <Link href="/"><Image src="/images/logo.png" alt="Tukaatu Express" width={140} height={44} style={{objectFit:'contain'}} /></Link>
    <CheckCircle2 size={44} color="#087477" style={{margin:'32px 0 24px'}} />
    <p className="auth-eyebrow">Your next chapter starts here</p><h1 style={{fontSize:34,fontWeight:750,letterSpacing:'-.04em'}}>Registration submitted.</h1>
    <p className="auth-description" style={{marginTop:20}}>Your merchant account is pending document verification. You will be able to create shipments after super admin approval.</p>
    <Link href="/login" style={{display:'inline-block',padding:'14px 22px',background:'#f4c542',borderRadius:12,fontWeight:700}}>Go to sign in →</Link>
  </div></main>;
}
