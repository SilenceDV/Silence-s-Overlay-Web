export function AccountStatus({email}:{email?:string}){return <div className="card"><h2>Account</h2><p>{email?`Signed in as ${email}`:"Not signed in"}</p></div>}
