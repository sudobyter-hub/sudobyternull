// =============================================================================
// nmap-engine.js — realistic nmap simulator
// Parses real flags, streams phased output with timing, supports NSE, OS
// fingerprinting, and 5 simulated targets. Pure frontend, no network calls.
// =============================================================================

(function () {
    'use strict';

    // -------------------------------------------------------------------------
    // Target database — each target has a realistic port/service profile
    // -------------------------------------------------------------------------
    const TARGETS = {
        'scanme.nmap.org': {
            ip: '45.33.32.156',
            hostnames: ['scanme.nmap.org'],
            rdns: 'scanme.nmap.org',
            os: {
                name: 'Linux 5.0 - 5.14',
                family: 'Linux',
                accuracy: 96,
                cpe: 'cpe:/o:linux:linux_kernel:5'
            },
            uptime: '12.341 days (since Fri Apr 10 02:44:12 2026)',
            distance: '14 hops',
            ports: [
                { port: 22,    proto: 'tcp', state: 'open',     service: 'ssh',     version: 'OpenSSH 8.2p1 Ubuntu 4ubuntu0.5 (Ubuntu Linux; protocol 2.0)',
                  scripts: {
                    'ssh-hostkey': '3072 ab:cd:ef:01:23:45:67:89:ab:cd:ef:01:23:45:67:89 (RSA)\n256 11:22:33:44:55:66:77:88:99:aa:bb:cc:dd:ee:ff:00 (ECDSA)\n256 aa:bb:cc:dd:ee:ff:00:11:22:33:44:55:66:77:88:99 (ED25519)',
                    'ssh-auth-methods': 'Supported authentication methods:\n  publickey\n  password'
                  }
                },
                { port: 80,    proto: 'tcp', state: 'open',     service: 'http',    version: 'Apache httpd 2.4.7 ((Ubuntu))',
                  scripts: {
                    'http-title': 'Go ahead and ScanMe!',
                    'http-server-header': 'Apache/2.4.7 (Ubuntu)',
                    'http-methods': '  Supported Methods: GET HEAD POST OPTIONS'
                  }
                },
                { port: 9929,  proto: 'tcp', state: 'open',     service: 'nping-echo', version: 'Nping echo' },
                { port: 31337, proto: 'tcp', state: 'open',     service: 'tcpwrapped' },
                { port: 25,    proto: 'tcp', state: 'filtered', service: 'smtp' }
            ]
        },

        'testphp.vulnweb.com': {
            ip: '44.228.249.3',
            hostnames: ['testphp.vulnweb.com'],
            rdns: 'ec2-44-228-249-3.us-west-2.compute.amazonaws.com',
            os: {
                name: 'Linux 4.15 - 5.6',
                family: 'Linux',
                accuracy: 94,
                cpe: 'cpe:/o:linux:linux_kernel'
            },
            uptime: '42.112 days',
            distance: '18 hops',
            ports: [
                { port: 80, proto: 'tcp', state: 'open', service: 'http', version: 'nginx 1.19.0',
                  scripts: {
                    'http-title': 'Home of Acunetix Art',
                    'http-server-header': 'nginx/1.19.0',
                    'http-robots.txt': '1 disallowed entry \n/admin',
                    'http-enum': '  /admin/: Possible admin folder\n  /login.php: Possible admin folder\n  /secured/: Potentially interesting folder'
                  }
                },
                { port: 443, proto: 'tcp', state: 'closed', service: 'https' }
            ]
        },

        'dc01.corp.local': {
            ip: '10.10.14.10',
            hostnames: ['dc01.corp.local', 'DC01'],
            rdns: 'dc01.corp.local',
            os: {
                name: 'Windows Server 2019 (build 17763)',
                family: 'Windows',
                accuracy: 98,
                cpe: 'cpe:/o:microsoft:windows_server_2019'
            },
            uptime: '203.45 days',
            distance: '2 hops',
            ports: [
                { port: 53,    proto: 'tcp', state: 'open', service: 'domain', version: 'Simple DNS Plus' },
                { port: 88,    proto: 'tcp', state: 'open', service: 'kerberos-sec', version: 'Microsoft Windows Kerberos (server time: 2026-04-22 14:02:18Z)' },
                { port: 135,   proto: 'tcp', state: 'open', service: 'msrpc', version: 'Microsoft Windows RPC' },
                { port: 139,   proto: 'tcp', state: 'open', service: 'netbios-ssn', version: 'Microsoft Windows netbios-ssn' },
                { port: 389,   proto: 'tcp', state: 'open', service: 'ldap', version: 'Microsoft Windows Active Directory LDAP (Domain: corp.local, Site: Default-First-Site-Name)' },
                { port: 445,   proto: 'tcp', state: 'open', service: 'microsoft-ds', version: 'Windows Server 2019 Standard 17763 microsoft-ds (workgroup: CORP)',
                  scripts: {
                    'smb-os-discovery': '  OS: Windows Server 2019 Standard 17763 (Windows Server 2019 Standard 6.3)\n  Computer name: DC01\n  NetBIOS computer name: DC01\\x00\n  Domain name: corp.local\n  Forest name: corp.local\n  FQDN: DC01.corp.local',
                    'smb-security-mode': '  account_used: guest\n  authentication_level: user\n  challenge_response: supported\n  message_signing: required',
                    'smb2-security-mode': '  Message signing enabled and required',
                    'smb-enum-shares': '  account_used: <blank>\n  \\\\10.10.14.10\\ADMIN$:\n    Type: STYPE_DISKTREE_HIDDEN\n    Comment: Remote Admin\n  \\\\10.10.14.10\\C$:\n    Type: STYPE_DISKTREE_HIDDEN\n    Comment: Default share\n  \\\\10.10.14.10\\IPC$:\n    Type: STYPE_IPC_HIDDEN\n    Comment: Remote IPC\n  \\\\10.10.14.10\\NETLOGON:\n    Type: STYPE_DISKTREE\n    Comment: Logon server share\n  \\\\10.10.14.10\\SYSVOL:\n    Type: STYPE_DISKTREE\n    Comment: Logon server share'
                  }
                },
                { port: 464,   proto: 'tcp', state: 'open', service: 'kpasswd5' },
                { port: 593,   proto: 'tcp', state: 'open', service: 'ncacn_http', version: 'Microsoft Windows RPC over HTTP 1.0' },
                { port: 636,   proto: 'tcp', state: 'open', service: 'tcpwrapped' },
                { port: 3268,  proto: 'tcp', state: 'open', service: 'ldap', version: 'Microsoft Windows Active Directory LDAP (Domain: corp.local)' },
                { port: 3269,  proto: 'tcp', state: 'open', service: 'tcpwrapped' },
                { port: 3389,  proto: 'tcp', state: 'open', service: 'ms-wbt-server', version: 'Microsoft Terminal Services',
                  scripts: {
                    'rdp-ntlm-info': '  Target_Name: CORP\n  NetBIOS_Domain_Name: CORP\n  NetBIOS_Computer_Name: DC01\n  DNS_Domain_Name: corp.local\n  DNS_Computer_Name: DC01.corp.local\n  DNS_Tree_Name: corp.local\n  Product_Version: 10.0.17763'
                  }
                }
            ]
        },

        'iot.local': {
            ip: '192.168.1.100',
            hostnames: ['iot.local'],
            rdns: 'iot.local',
            os: {
                name: 'Linux 3.2 (embedded)',
                family: 'Linux',
                accuracy: 89,
                cpe: 'cpe:/o:linux:linux_kernel:3.2'
            },
            uptime: '1.234 days',
            distance: '1 hop',
            ports: [
                { port: 23,   proto: 'tcp', state: 'open', service: 'telnet', version: 'BusyBox telnetd',
                  scripts: {
                    'telnet-encryption': '  Telnet server does not support encryption'
                  }
                },
                { port: 80,   proto: 'tcp', state: 'open', service: 'http', version: 'lighttpd 1.4.45',
                  scripts: {
                    'http-title': 'IoT Admin Panel',
                    'http-auth': 'HTTP/1.1 401 Unauthorized\\x0D\n  Basic realm=IoT Device'
                  }
                },
                { port: 1883, proto: 'tcp', state: 'open', service: 'mqtt', version: 'Mosquitto MQTT broker 1.6.9' },
                { port: 8883, proto: 'tcp', state: 'open', service: 'secure-mqtt' }
            ]
        },

        'webapp.dev': {
            ip: '10.10.14.42',
            hostnames: ['webapp.dev'],
            rdns: 'webapp.dev',
            os: {
                name: 'Linux 5.4 - 5.10',
                family: 'Linux',
                accuracy: 95,
                cpe: 'cpe:/o:linux:linux_kernel:5'
            },
            uptime: '8.902 days',
            distance: '3 hops',
            ports: [
                { port: 22,   proto: 'tcp', state: 'open', service: 'ssh', version: 'OpenSSH 8.9p1 Ubuntu 3ubuntu0.4 (Ubuntu Linux; protocol 2.0)' },
                { port: 80,   proto: 'tcp', state: 'open', service: 'http', version: 'Apache httpd 2.4.52',
                  scripts: {
                    'http-title': 'Login - WebApp.dev',
                    'http-methods': '  Supported Methods: GET HEAD POST OPTIONS',
                    'http-robots.txt': '2 disallowed entries \n/admin /backup'
                  }
                },
                { port: 3306, proto: 'tcp', state: 'open', service: 'mysql', version: 'MySQL 8.0.32-0ubuntu0.22.04.2',
                  scripts: {
                    'mysql-info': '  Protocol: 10\n  Version: 8.0.32-0ubuntu0.22.04.2\n  Thread ID: 421\n  Capabilities flags: 65535\n  Status: Autocommit'
                  }
                },
                { port: 5985, proto: 'tcp', state: 'open', service: 'wsman', version: 'Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)' },
                { port: 8080, proto: 'tcp', state: 'open', service: 'http-proxy', version: 'Apache Tomcat 9.0.71',
                  scripts: {
                    'http-title': 'Apache Tomcat/9.0.71',
                    'http-enum': '  /manager/html: Apache Tomcat Manager\n  /host-manager/html: Apache Tomcat Host Manager'
                  }
                }
            ]
        }
    };

    // Aliases so users can type either the hostname or the IP
    const ALIASES = {
        '45.33.32.156':     'scanme.nmap.org',
        '44.228.249.3':     'testphp.vulnweb.com',
        '10.10.14.10':      'dc01.corp.local',
        '192.168.1.10':     'dc01.corp.local',
        '192.168.1.100':    'iot.local',
        '10.10.14.42':      'webapp.dev',
        'localhost':        'webapp.dev',
        '127.0.0.1':        'webapp.dev'
    };

    // -------------------------------------------------------------------------
    // Flag parser
    // -------------------------------------------------------------------------
    function parseArgs(argv) {
        const opts = {
            scanTypes: [],         // sS, sT, sU, sV, sC, A, O, sn
            ports: null,           // string like "22,80,443" or "-" or null
            topPorts: null,        // number or null
            fastScan: false,       // -F
            timing: 3,             // -T0..5
            verbose: 0,            // -v count
            scripts: [],           // from --script
            skipPing: false,       // -Pn
            noDns: false,          // -n
            openOnly: false,       // --open
            reason: false,         // --reason
            minRate: null,
            output: null,          // oN | oA | oG | oX with filename
            fragments: false,      // -f
            decoys: null,          // -D value
            sourcePort: null,      // --source-port
            scanDelay: null,
            dataLength: null,
            showHelp: false,
            showVersion: false,
            target: null,
            errors: []
        };

        for (let i = 0; i < argv.length; i++) {
            const a = argv[i];
            switch (true) {
                case a === '-h' || a === '--help': opts.showHelp = true; break;
                case a === '-V' || a === '--version': opts.showVersion = true; break;
                case a === '-sS': opts.scanTypes.push('sS'); break;
                case a === '-sT': opts.scanTypes.push('sT'); break;
                case a === '-sU': opts.scanTypes.push('sU'); break;
                case a === '-sV': opts.scanTypes.push('sV'); break;
                case a === '-sC': opts.scanTypes.push('sC'); opts.scripts.push('default'); break;
                case a === '-sn': opts.scanTypes.push('sn'); break;
                case a === '-A':  opts.scanTypes.push('sV','sC','O','A'); opts.scripts.push('default'); break;
                case a === '-O':  opts.scanTypes.push('O'); break;
                case a === '-Pn': opts.skipPing = true; break;
                case a === '-n':  opts.noDns = true; break;
                case a === '-F':  opts.fastScan = true; break;
                case a === '--open': opts.openOnly = true; break;
                case a === '--reason': opts.reason = true; break;
                case a === '-f':  opts.fragments = true; break;
                case a === '-v':  opts.verbose = Math.max(opts.verbose, 1); break;
                case a === '-vv': opts.verbose = 2; break;
                case a === '-vvv': opts.verbose = 3; break;
                case /^-T[0-5]$/.test(a): opts.timing = parseInt(a[2], 10); break;
                case a === '-p':
                    opts.ports = argv[++i]; break;
                case /^-p(.+)$/.test(a):
                    opts.ports = a.slice(2); break;
                case a === '--top-ports':
                    opts.topPorts = parseInt(argv[++i], 10); break;
                case a === '--min-rate':
                    opts.minRate = parseInt(argv[++i], 10); break;
                case a === '--script':
                    opts.scripts = opts.scripts.concat(argv[++i].split(',').map(s => s.trim())); break;
                case /^--script=/.test(a):
                    opts.scripts = opts.scripts.concat(a.slice(9).split(',').map(s => s.trim())); break;
                case a === '-D':
                    opts.decoys = argv[++i]; break;
                case a === '--source-port': case '-g':
                    opts.sourcePort = argv[++i]; break;
                case a === '--scan-delay':
                    opts.scanDelay = argv[++i]; break;
                case a === '--data-length':
                    opts.dataLength = argv[++i]; break;
                case a === '-oN' || a === '-oG' || a === '-oX' || a === '-oA':
                    opts.output = { fmt: a.slice(2), file: argv[++i] }; break;
                case a.startsWith('-'):
                    opts.errors.push(`unrecognized option '${a}'`); break;
                default:
                    opts.target = a;
            }
        }
        if (opts.scanTypes.length === 0 && !opts.scripts.length) opts.scanTypes.push('sS');
        return opts;
    }

    // -------------------------------------------------------------------------
    // Port list resolution
    // -------------------------------------------------------------------------
    function resolvePorts(opts, targetPorts) {
        if (opts.ports === '-') {
            return range(1, 65535);
        }
        if (opts.ports) {
            // comma-separated, with possible ranges
            const set = new Set();
            opts.ports.split(',').forEach(p => {
                const m = p.match(/^(\d+)-(\d+)$/);
                if (m) range(+m[1], +m[2]).forEach(n => set.add(n));
                else if (/^\d+$/.test(p)) set.add(+p);
            });
            return Array.from(set).sort((a,b) => a - b);
        }
        if (opts.fastScan) {
            return [21,22,23,25,53,80,110,111,135,139,143,443,445,993,995,1723,3306,3389,5900,8080];
        }
        if (opts.topPorts) {
            // simulate: top-N = sorted by frequency, we just slice from a canonical list
            const TOP = [80,23,443,21,22,25,3389,110,445,139,143,53,135,3306,8080,1723,111,995,993,5900,
                         1025,587,8888,199,1720,465,548,113,81,6001,10000,514,5060,179,1026,2000,8443,
                         8000,32768,554,26,1433,49152,2001,515,8008,49154,1027,5666,646,5000,5631,631,
                         49153,8081,2049,88,79,5800,106,2121,1110,49155,6000,513,990,5357,427,49156,
                         543,544,5101,144,7,389,8009,3128,444,9999,5009,7070,5190,3000,5432,1900,3986,
                         13,1029,9,5051,6646,49157,1028,873,1755,2717,4899,9100,119,37];
            return TOP.slice(0, opts.topPorts);
        }
        return [21,22,23,25,53,80,110,135,139,143,443,445,993,995,3306,3389,8080];
    }

    function range(a, b) {
        const out = [];
        for (let i = a; i <= b; i++) out.push(i);
        return out;
    }

    // -------------------------------------------------------------------------
    // Output helpers
    // -------------------------------------------------------------------------
    function colorize(line) {
        // wraps the outermost segments in CSS classes
        return line;
    }

    function now() {
        return new Date().toTimeString().slice(0, 8);
    }

    function iso() {
        return new Date().toISOString().replace('T',' ').slice(0, 19);
    }

    function pad(s, n) { s = String(s); return s + ' '.repeat(Math.max(0, n - s.length)); }

    // -------------------------------------------------------------------------
    // Main runner — streams output via emit(line, {cls})
    // -------------------------------------------------------------------------
    async function runNmap(argv, emit, opts = {}) {
        const args = parseArgs(argv);

        if (args.showHelp)    return emitHelp(emit);
        if (args.showVersion) return emitVersion(emit);

        if (!args.target) {
            emit('WARNING: No targets were specified, so 0 hosts scanned.', 'warn');
            emit('Nmap done: 0 IP addresses (0 hosts up) scanned in 0.02 seconds', 'dim');
            return;
        }

        if (args.errors.length) {
            args.errors.forEach(e => emit(`nmap: ${e}`, 'err'));
            emit("See the output of nmap -h for a summary of options.", 'dim');
            return;
        }

        // Resolve target
        const canonical = ALIASES[args.target] || args.target;
        const target = TARGETS[canonical];
        const unknown = !target;

        // timing multiplier — T0 paranoid, T5 insane
        const delayMul = [5, 3, 1.5, 1, 0.5, 0.25][args.timing];
        const delay = (ms) => opts.fast ? new Promise(r => setTimeout(r, 0)) : new Promise(r => setTimeout(r, ms * delayMul));

        emit(`Starting Nmap 7.94SVN ( https://nmap.org ) at ${iso()} UTC`, 'info');
        await delay(180);

        // NSE pre-scan
        if (args.scripts.length) {
            emit('NSE: Loaded 156 scripts for scanning.', 'dim');
            emit('NSE: Script Pre-scanning.', 'dim');
            emit(`Initiating NSE at ${now()}`, 'info');
            await delay(220);
            emit(`Completed NSE at ${now()}, 0.00s elapsed`, 'dim');
            emit(`Initiating NSE at ${now()}`, 'info');
            await delay(150);
            emit(`Completed NSE at ${now()}, 0.00s elapsed`, 'dim');
        }

        // Host discovery
        if (!args.skipPing && !unknown) {
            emit(`Initiating Ping Scan at ${now()}`, 'info');
            emit(`Scanning ${canonical} (${target.ip}) [4 ports]`, 'dim');
            await delay(260);
            emit(`Completed Ping Scan at ${now()}, 0.21s elapsed (1 total hosts)`, 'dim');
        }

        // DNS
        if (!args.noDns && !unknown) {
            emit(`Initiating Parallel DNS resolution of 1 host. at ${now()}`, 'info');
            await delay(140);
            emit(`Completed Parallel DNS resolution of 1 host. at ${now()}, 0.04s elapsed`, 'dim');
        }

        if (unknown) {
            // Behave like a real scan against a host that's up but has nothing interesting
            emit(`Note: Host seems down. If it is really up, but blocking our ping probes, try -Pn`, 'warn');
            emit(`Nmap done: 1 IP address (0 hosts up) scanned in ${(1.2 * delayMul).toFixed(2)} seconds`, 'dim');
            return;
        }

        // If -sn, stop here after printing host up
        if (args.scanTypes.includes('sn')) {
            emit(`Nmap scan report for ${canonical} (${target.ip})`, 'accent');
            emit(`Host is up (0.0${Math.floor(Math.random()*90+10)}s latency).`, 'ok');
            emit(`Nmap done: 1 IP address (1 host up) scanned in ${(0.45 * delayMul).toFixed(2)} seconds`, 'dim');
            return;
        }

        // Port scan phase
        const ports = resolvePorts(args, target.ports);
        const scanName = args.scanTypes.includes('sT') ? 'Connect Scan'
                       : args.scanTypes.includes('sU') ? 'UDP Scan'
                       : 'SYN Stealth Scan';
        emit(`Initiating ${scanName} at ${now()}`, 'info');
        emit(`Scanning ${canonical} (${target.ip}) [${ports.length} ports]`, 'dim');

        // Stream "Discovered open port" lines for ports that match scan + are open
        const discovered = [];
        const portsByNum = Object.fromEntries(target.ports.map(p => [p.port, p]));
        for (const pn of ports) {
            const p = portsByNum[pn];
            if (p && p.state === 'open') {
                discovered.push(p);
                if (args.verbose >= 1) {
                    emit(`Discovered open port ${p.port}/${p.proto} on ${target.ip}`, 'ok');
                    await delay(60);
                }
            }
        }
        await delay(400);
        emit(`Completed ${scanName} at ${now()}, ${(1.1 * delayMul).toFixed(2)}s elapsed (${ports.length} total ports)`, 'dim');

        // Service/Version detection
        if (args.scanTypes.includes('sV') || args.scanTypes.includes('A')) {
            emit(`Initiating Service scan at ${now()}`, 'info');
            emit(`Scanning ${discovered.length} services on ${canonical} (${target.ip})`, 'dim');
            await delay(560);
            emit(`Completed Service scan at ${now()}, ${(6.2 * delayMul).toFixed(2)}s elapsed (${discovered.length} services on 1 host)`, 'dim');
        }

        // OS detection
        if (args.scanTypes.includes('O') || args.scanTypes.includes('A')) {
            emit(`Initiating OS detection (try #1) against ${canonical} (${target.ip})`, 'info');
            await delay(380);
        }

        // NSE script scan
        if (args.scripts.length) {
            emit(`NSE: Script scanning ${target.ip}.`, 'dim');
            emit(`Initiating NSE at ${now()}`, 'info');
            await delay(620);
            emit(`Completed NSE at ${now()}, ${(2.3 * delayMul).toFixed(2)}s elapsed`, 'dim');
            emit(`Initiating NSE at ${now()}`, 'info');
            await delay(180);
            emit(`Completed NSE at ${now()}, 0.00s elapsed`, 'dim');
        }

        // ---- Report ----
        emit('', 'dim');
        emit(`Nmap scan report for ${canonical} (${target.ip})`, 'accent');
        if (!args.noDns && target.rdns && target.rdns !== canonical) {
            emit(`rDNS record for ${target.ip}: ${target.rdns}`, 'dim');
        }
        emit(`Host is up (0.0${Math.floor(Math.random()*90+10)}s latency).`, 'ok');

        // Ports to display
        const toShow = args.openOnly
            ? target.ports.filter(p => ports.includes(p.port) && p.state === 'open')
            : target.ports.filter(p => ports.includes(p.port));
        const notShown = ports.length - toShow.length;
        if (notShown > 0 && !args.openOnly) {
            emit(`Not shown: ${notShown} closed tcp ports (reset)`, 'dim');
        }

        emit(`${pad('PORT', 9)}${pad('STATE', 10)}${pad('SERVICE', 15)}VERSION`, 'hdr');
        for (const p of toShow) {
            const showVer = args.scanTypes.includes('sV') || args.scanTypes.includes('A');
            const stateClass = p.state === 'open' ? 'ok' : (p.state === 'filtered' ? 'warn' : 'dim');
            const line = `${pad(`${p.port}/${p.proto}`, 9)}${pad(p.state, 10)}${pad(p.service || '', 15)}${showVer && p.version ? p.version : ''}`;
            emit(line, stateClass);
            // script output
            if (p.scripts && (args.scanTypes.includes('sC') || args.scripts.includes('default') || args.scripts.includes('vuln') || args.scanTypes.includes('A'))) {
                for (const [name, out] of Object.entries(p.scripts)) {
                    emit(`| ${name}:`, 'nse');
                    out.split('\n').forEach(ln => emit(`| ${ln}`, 'nsebody'));
                    emit('|_', 'nse');
                }
            }
        }

        // OS fingerprint block
        if (args.scanTypes.includes('O') || args.scanTypes.includes('A')) {
            emit('', 'dim');
            emit(`Device type: ${target.os.family === 'Windows' ? 'general purpose' : 'general purpose'}`, 'dim');
            emit(`Running: ${target.os.name}`, 'accent');
            emit(`OS CPE: ${target.os.cpe}`, 'dim');
            emit(`OS details: ${target.os.name}`, 'accent');
            emit(`Uptime guess: ${target.uptime}`, 'dim');
            emit(`Network Distance: ${target.distance}`, 'dim');
        }

        // Output file stub
        if (args.output) {
            emit('', 'dim');
            emit(`Output written to ${args.output.file || 'nmap-output'}.${args.output.fmt === 'oA' ? 'nmap/.gnmap/.xml' : args.output.fmt.toLowerCase()}`, 'info');
        }

        emit('', 'dim');
        emit(`Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .`, 'dim');
        const elapsed = (6 + discovered.length * 0.8) * delayMul;
        emit(`Nmap done: 1 IP address (1 host up) scanned in ${elapsed.toFixed(2)} seconds`, 'dim');
    }

    function emitHelp(emit) {
        const H = [
            'Nmap 7.94SVN ( https://nmap.org )',
            'Usage: nmap [Scan Type(s)] [Options] {target specification}',
            'TARGET SPECIFICATION:',
            '  Can pass hostnames, IP addresses, networks, etc.',
            '  Simulated targets available here:',
            '    scanme.nmap.org   (45.33.32.156)',
            '    testphp.vulnweb.com (44.228.249.3)',
            '    dc01.corp.local   (10.10.14.10)   ← Active Directory DC',
            '    iot.local         (192.168.1.100) ← IoT/telnet box',
            '    webapp.dev        (10.10.14.42)   ← CTF-style target',
            'HOST DISCOVERY:',
            '  -sn: Ping scan - disable port scan',
            '  -Pn: Treat all hosts as online -- skip host discovery',
            '  -n:  Never do DNS resolution',
            'SCAN TECHNIQUES:',
            '  -sS/sT/sU: TCP SYN/Connect()/UDP scans',
            '  -sV: Probe open ports to determine service/version info',
            '  -sC: equivalent to --script=default',
            'PORT SPECIFICATION:',
            '  -p <port ranges>: Only scan specified ports',
            '    Ex: -p22,80,443  or  -p1-65535  or  -p-',
            '  --top-ports <number>: Scan <number> most common ports',
            '  -F: Fast mode (fewer ports than default)',
            'SERVICE/VERSION DETECTION:',
            '  -sV: probe for service/version info',
            '  -A: enable -sV, -sC, -O, and traceroute',
            '  -O: enable OS detection',
            'TIMING AND PERFORMANCE:',
            '  -T<0-5>: Set timing template (higher is faster)',
            '  --min-rate <number>: Send packets no slower than <number> per second',
            'OUTPUT:',
            '  -oN/-oX/-oG/-oA <file>: Output in Normal, XML, Grepable or All three formats',
            '  -v: Increase verbosity  -vv: even more',
            '  --open: Only show open (or possibly open) ports',
            '  --reason: Display the reason a port is in a particular state',
            'MISC:',
            '  -h: Print this help summary page.',
            '  -V: Print version number',
            'EXAMPLES:',
            '  nmap -v -A scanme.nmap.org',
            '  nmap -sV -sC -p- dc01.corp.local',
            '  nmap --script=vuln -p 80,443 testphp.vulnweb.com',
            '  nmap -sS -T4 --top-ports 100 --open webapp.dev'
        ];
        H.forEach(l => emit(l, 'dim'));
    }

    function emitVersion(emit) {
        emit('Nmap version 7.94SVN ( https://nmap.org )', 'accent');
        emit('Platform: x86_64-pc-linux-gnu', 'dim');
        emit('Compiled with: nmap-liblua-5.4.4 openssl-3.0.2 nmap-libssh2-1.10.0 nmap-libz-1.2.11 nmap-libpcre-8.45 nmap-libpcap-1.10.3 nmap-libdnet-1.12 ipv6', 'dim');
        emit('Compiled without:', 'dim');
        emit('Available nsock engines: epoll poll select', 'dim');
    }

    // expose
    window.NmapEngine = { run: runNmap };
})();
