// =============================================================================
// Smarter — primers (long-form concept explainers).
// Each entry renders as a card on the homepage that links to a standalone page.
// =============================================================================

window.SMARTER_PRIMERS = [
    {
        id: 'kerberoasted-hash',
        title: 'You Kerberoasted a hash. Your move.',
        subtitle: 'A continuation primer. You have a TGS-REP blob — walking the chain from a single hash to Domain Admin: cracking, LDAP triage, the five typical wins, the lateral move, and what to do when the hash refuses to crack.',
        level: 'intermediate',
        readMin: 18,
        tags: ['kerberoasting', 'active-directory', 'red-team', 'continuation', 'hashcat'],
        link: 'smarter/kerberoasted-hash.html',
        updated: '2026-05-17'
    },
    {
        id: 'active-directory',
        title: 'Active Directory, in plain words',
        subtitle: "An apartment building's doorman, but for computers. Why AD exists, how it actually works, and the five attacks every red-teamer reaches for first.",
        level: 'beginner-friendly',
        readMin: 15,
        tags: ['active-directory', 'kerberos', 'ldap', 'red-team'],
        link: 'smarter/active-directory.html',
        updated: '2026-05-17'
    }
];
