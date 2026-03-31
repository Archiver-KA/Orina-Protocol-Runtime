# AGENTS

<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to use skills:
- Invoke: `npx openskills read <skill-name>` (run in your shell)
  - For multiple: `npx openskills read skill-one,skill-two`
- The skill content will load with detailed instructions on how to complete the task
- Base directory provided in output for resolving bundled resources (references/, scripts/, assets/)

Usage notes:
- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already loaded in your context
- Each skill invocation is stateless
</usage>

<available_skills>

<skill>
<name>acquiring-disk-image-with-dd-and-dcfldd</name>
<description>Create forensically sound bit-for-bit disk images using dd and dcfldd while preserving evidence integrity through hash verification.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-active-directory-acl-abuse</name>
<description>Detect dangerous ACL misconfigurations in Active Directory using ldap3 to identify GenericAll, WriteDACL, and WriteOwner abuse paths</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-android-malware-with-apktool</name>
<description>Perform static analysis of Android APK malware samples using apktool for decompilation, jadx for Java source recovery, and androguard for permission analysis, manifest inspection, and suspicious API call detection.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-api-gateway-access-logs</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-apt-group-with-mitre-navigator</name>
<description>Analyze advanced persistent threat (APT) group techniques using MITRE ATT&CK Navigator to create layered heatmaps of adversary TTPs for detection gap analysis and threat-informed defense.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-azure-activity-logs-for-threats</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-bootkit-and-rootkit-samples</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-browser-forensics-with-hindsight</name>
<description>Analyze Chromium-based browser artifacts using Hindsight to extract browsing history, downloads, cookies, cached content, autofill data, saved passwords, and browser extensions from Chrome, Edge, Brave, and Opera for forensic investigation.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-campaign-attribution-evidence</name>
<description>Campaign attribution analysis involves systematically evaluating evidence to determine which threat actor or group is responsible for a cyber operation. This skill covers collecting and weighting attr</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-certificate-transparency-for-phishing</name>
<description>Monitor Certificate Transparency logs using crt.sh and Certstream to detect phishing domains, lookalike certificates, and unauthorized certificate issuance targeting your organization.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-cloud-storage-access-patterns</name>
<description>>-</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-cobalt-strike-beacon-configuration</name>
<description>Extract and analyze Cobalt Strike beacon configuration from PE files and memory dumps to identify C2 infrastructure, malleable profiles, and operator tradecraft.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-cobaltstrike-malleable-c2-profiles</name>
<description>Parse and analyze Cobalt Strike Malleable C2 profiles using dissect.cobaltstrike and pyMalleableC2 to extract C2 indicators, detect evasion techniques, and generate network detection signatures.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-command-and-control-communication</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-cyber-kill-chain</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-disk-image-with-autopsy</name>
<description>Perform comprehensive forensic analysis of disk images using Autopsy to recover files, examine artifacts, and build investigation timelines.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-dns-logs-for-exfiltration</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-docker-container-forensics</name>
<description>Investigate compromised Docker containers by analyzing images, layers, volumes, logs, and runtime artifacts to identify malicious activity and evidence.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-email-headers-for-phishing-investigation</name>
<description>Parse and analyze email headers to trace the origin of phishing emails, verify sender authenticity, and identify spoofing through SPF, DKIM, and DMARC validation.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-ethereum-smart-contract-vulnerabilities</name>
<description>Perform static and symbolic analysis of Solidity smart contracts using Slither and Mythril to detect reentrancy, integer overflow, access control, and other vulnerability classes before deployment to Ethereum mainnet.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-golang-malware-with-ghidra</name>
<description>Reverse engineer Go-compiled malware using Ghidra with specialized scripts for function recovery, string extraction, and type reconstruction in stripped Go binaries.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-heap-spray-exploitation</name>
<description>Detect and analyze heap spray attacks in memory dumps using Volatility3 plugins to identify NOP sled patterns, shellcode landing zones, and suspicious large allocations in process virtual address space.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-indicators-of-compromise</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-ios-app-security-with-objection</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-kubernetes-audit-logs</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-linux-audit-logs-for-intrusion</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-linux-elf-malware</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-linux-kernel-rootkits</name>
<description>Detect kernel-level rootkits in Linux memory dumps using Volatility3 linux plugins (check_syscall, lsmod, hidden_modules), rkhunter system scanning, and /proc vs /sys discrepancy analysis to identify hooked syscalls, hidden kernel modules, and tampered system structures.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-linux-system-artifacts</name>
<description>Examine Linux system artifacts including auth logs, cron jobs, shell history, and system configuration to uncover evidence of compromise or unauthorized activity.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-lnk-file-and-jump-list-artifacts</name>
<description>Analyze Windows LNK shortcut files and Jump List artifacts to establish evidence of file access, program execution, and user activity using LECmd, JLECmd, and manual binary parsing of the Shell Link Binary format.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-macro-malware-in-office-documents</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-malicious-pdf-with-peepdf</name>
<description>Perform static analysis of malicious PDF documents using peepdf, pdfid, and pdf-parser to extract embedded JavaScript, shellcode, and suspicious objects.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-malicious-url-with-urlscan</name>
<description>URLScan.io is a free service for scanning and analyzing suspicious URLs. It captures screenshots, DOM content, HTTP transactions, JavaScript behavior, and network connections of web pages in an isolat</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-malware-behavior-with-cuckoo-sandbox</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-malware-family-relationships-with-malpedia</name>
<description>Use the Malpedia platform and API to research malware family relationships, track variant evolution, link families to threat actors, and integrate YARA rules for detection across malware lineages.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-malware-persistence-with-autoruns</name>
<description>Use Sysinternals Autoruns to systematically identify and analyze malware persistence mechanisms across registry keys, scheduled tasks, services, drivers, and startup locations on Windows systems.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-malware-sandbox-evasion-techniques</name>
<description>Detect sandbox evasion techniques in malware samples by analyzing timing checks, VM artifact queries, user interaction detection, and sleep inflation patterns from Cuckoo/AnyRun behavioral reports</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-memory-dumps-with-volatility</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-memory-forensics-with-lime-and-volatility</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-mft-for-deleted-file-recovery</name>
<description>Analyze the NTFS Master File Table ($MFT) to recover metadata and content of deleted files by examining MFT record entries, $LogFile, $UsnJrnl, and MFT slack space using MFTECmd, analyzeMFT, and X-Ways Forensics.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-network-covert-channels-in-malware</name>
<description>Detect and analyze covert communication channels used by malware including DNS tunneling, ICMP exfiltration, steganographic HTTP, and protocol abuse for C2 and data exfiltration.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-network-flow-data-with-netflow</name>
<description>>-</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-network-packets-with-scapy</name>
<description>Craft, send, sniff, and dissect network packets using Scapy for protocol analysis, network reconnaissance, and traffic anomaly detection in authorized security testing</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-network-traffic-for-incidents</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-network-traffic-of-malware</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-network-traffic-with-wireshark</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-office365-audit-logs-for-compromise</name>
<description>Parse Office 365 Unified Audit Logs via Microsoft Graph API to detect email forwarding rule creation, inbox delegation, suspicious OAuth app grants, and other indicators of account compromise.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-outlook-pst-for-email-forensics</name>
<description>Analyze Microsoft Outlook PST and OST files for email forensic evidence including message content, headers, attachments, deleted items, and metadata using libpff, pst-utils, and forensic email analysis tools for legal investigations and incident response.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-packed-malware-with-upx-unpacker</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-pdf-malware-with-pdfid</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-persistence-mechanisms-in-linux</name>
<description>Detect and analyze Linux persistence mechanisms including crontab entries, systemd service units, LD_PRELOAD hijacking, bashrc modifications, and authorized_keys backdoors using auditd and file integrity monitoring</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-powershell-empire-artifacts</name>
<description>Detect PowerShell Empire framework artifacts in Windows event logs by identifying Base64 encoded launcher patterns, default user agents, staging URL structures, stager IOCs, and known Empire module signatures in Script Block Logging events.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-powershell-script-block-logging</name>
<description>>-</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-prefetch-files-for-execution-history</name>
<description>Parse Windows Prefetch files to determine program execution history including run counts, timestamps, and referenced files for forensic investigation.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-ransomware-encryption-mechanisms</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-ransomware-leak-site-intelligence</name>
<description>Monitor and analyze ransomware group data leak sites (DLS) to track victim postings, extract threat intelligence on group tactics, and assess sector-specific ransomware risk for proactive defense.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-ransomware-network-indicators</name>
<description>Identify ransomware network indicators including C2 beaconing patterns, TOR exit node connections, data exfiltration flows, and encryption key exchange via Zeek conn.log and NetFlow analysis</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-ransomware-payment-wallets</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-sbom-for-supply-chain-vulnerabilities</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-security-logs-with-splunk</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-slack-space-and-file-system-artifacts</name>
<description>Examine file system slack space, MFT entries, USN journal, and alternate data streams to recover hidden data and reconstruct file activity on NTFS volumes.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-supply-chain-malware-artifacts</name>
<description>Investigate supply chain attack artifacts including trojanized software updates, compromised build pipelines, and sideloaded dependencies to identify intrusion vectors and scope of compromise.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-threat-actor-ttps-with-mitre-attack</name>
<description>MITRE ATT&CK is a globally-accessible knowledge base of adversary tactics, techniques, and procedures (TTPs) based on real-world observations. This skill covers systematically mapping threat actor beh</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-threat-actor-ttps-with-mitre-navigator</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-threat-intelligence-feeds</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-threat-landscape-with-misp</name>
<description>>-</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-tls-certificate-transparency-logs</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-typosquatting-domains-with-dnstwist</name>
<description>Detect typosquatting, homograph phishing, and brand impersonation domains using dnstwist to generate domain permutations and identify registered lookalike domains targeting your organization.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-uefi-bootkit-persistence</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-usb-device-connection-history</name>
<description>Investigate USB device connection history from Windows registry, event logs, and setupapi logs to track removable media usage and potential data exfiltration.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-web-server-logs-for-intrusion</name>
<description>>-</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-windows-amcache-artifacts</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-windows-event-logs-in-splunk</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>analyzing-windows-lnk-files-for-artifacts</name>
<description>Parse Windows LNK shortcut files to extract target paths, timestamps, volume information, and machine identifiers for forensic timeline reconstruction.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-windows-prefetch-with-python</name>
<description>Parse Windows Prefetch files using the windowsprefetch Python library to reconstruct application execution history, detect renamed or masquerading binaries, and identify suspicious program execution patterns.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-windows-registry-for-artifacts</name>
<description>Extract and analyze Windows Registry hives to uncover user activity, installed software, autostart entries, and evidence of system compromise.</description>
<location>project</location>
</skill>

<skill>
<name>analyzing-windows-shellbag-artifacts</name>
<description>Analyze Windows Shellbag registry artifacts to reconstruct folder browsing activity, detect access to removable media and network shares, and establish user interaction with directories even after deletion using SBECmd and ShellBags Explorer.</description>
<location>project</location>
</skill>

<skill>
<name>auditing-aws-s3-bucket-permissions</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>auditing-azure-active-directory-configuration</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>auditing-cloud-with-cis-benchmarks</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>auditing-gcp-iam-permissions</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>auditing-kubernetes-cluster-rbac</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>auditing-terraform-infrastructure-for-security</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>auditing-tls-certificate-transparency-logs</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>automating-ioc-enrichment</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>building-adversary-infrastructure-tracking-system</name>
<description>Build an automated system to track adversary infrastructure using passive DNS, certificate transparency, WHOIS data, and IP enrichment to map and monitor threat actor command-and-control networks.</description>
<location>project</location>
</skill>

<skill>
<name>building-attack-pattern-library-from-cti-reports</name>
<description>Extract and catalog attack patterns from cyber threat intelligence reports into a structured STIX-based library mapped to MITRE ATT&CK for detection engineering and threat-informed defense.</description>
<location>project</location>
</skill>

<skill>
<name>building-automated-malware-submission-pipeline</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>building-c2-infrastructure-with-sliver-framework</name>
<description>Build and configure a resilient command-and-control infrastructure using BishopFox's Sliver C2 framework with redirectors, HTTPS listeners, and multi-operator support for authorized red team engagements.</description>
<location>project</location>
</skill>

<skill>
<name>building-cloud-siem-with-sentinel</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>building-detection-rule-with-splunk-spl</name>
<description>Build effective detection rules using Splunk Search Processing Language (SPL) correlation searches to identify security threats in SOC environments.</description>
<location>project</location>
</skill>

<skill>
<name>building-detection-rules-with-sigma</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>building-devsecops-pipeline-with-gitlab-ci</name>
<description>Design and implement a comprehensive DevSecOps pipeline in GitLab CI/CD integrating SAST, DAST, container scanning, dependency scanning, and secret detection.</description>
<location>project</location>
</skill>

<skill>
<name>building-identity-federation-with-saml-azure-ad</name>
<description>Establish SAML 2.0 identity federation between on-premises Active Directory and Azure AD (Microsoft Entra ID) for seamless cross-domain authentication and SSO to cloud applications.</description>
<location>project</location>
</skill>

<skill>
<name>building-identity-governance-lifecycle-process</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>building-incident-response-dashboard</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>building-incident-response-playbook</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>building-incident-timeline-with-timesketch</name>
<description>Build collaborative forensic incident timelines using Timesketch to ingest, normalize, and analyze multi-source event data for attack chain reconstruction and investigation documentation.</description>
<location>project</location>
</skill>

<skill>
<name>building-ioc-defanging-and-sharing-pipeline</name>
<description>Build an automated pipeline to defang indicators of compromise (URLs, IPs, domains, emails) for safe sharing and distribute them in STIX format through TAXII feeds and threat intelligence platforms.</description>
<location>project</location>
</skill>

<skill>
<name>building-ioc-enrichment-pipeline-with-opencti</name>
<description>OpenCTI is an open-source platform for managing cyber threat intelligence knowledge, built on STIX 2.1 as its native data model. This skill covers building an automated IOC enrichment pipeline using O</description>
<location>project</location>
</skill>

<skill>
<name>building-malware-incident-communication-template</name>
<description>Build structured communication templates for malware incidents including stakeholder notifications, executive briefings, technical advisories, and regulatory disclosures with severity-based escalation procedures.</description>
<location>project</location>
</skill>

<skill>
<name>building-patch-tuesday-response-process</name>
<description>Establish a structured operational process to triage, test, and deploy Microsoft Patch Tuesday security updates within risk-based remediation SLAs.</description>
<location>project</location>
</skill>

<skill>
<name>building-phishing-reporting-button-workflow</name>
<description>Implement a phishing report button in email clients with automated triage workflow that analyzes user-reported suspicious emails and provides feedback to reporters.</description>
<location>project</location>
</skill>

<skill>
<name>building-ransomware-playbook-with-cisa-framework</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>building-red-team-c2-infrastructure-with-havoc</name>
<description>Deploy and configure the Havoc C2 framework with teamserver, HTTPS listeners, redirectors, and Demon agents for authorized red team operations.</description>
<location>project</location>
</skill>

<skill>
<name>building-role-mining-for-rbac-optimization</name>
<description>Apply bottom-up and top-down role mining techniques to discover optimal RBAC roles from existing user-permission assignments, reducing role explosion and enforcing least privilege.</description>
<location>project</location>
</skill>

<skill>
<name>building-soc-escalation-matrix</name>
<description>Build a structured SOC escalation matrix defining severity tiers, response SLAs, escalation paths, and notification procedures for security incidents.</description>
<location>project</location>
</skill>

<skill>
<name>building-soc-metrics-and-kpi-tracking</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>building-soc-playbook-for-ransomware</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>building-threat-actor-profile-from-osint</name>
<description>Build comprehensive threat actor profiles using open-source intelligence (OSINT) techniques to document adversary motivations, capabilities, infrastructure, and TTPs for proactive defense.</description>
<location>project</location>
</skill>

<skill>
<name>building-threat-feed-aggregation-with-misp</name>
<description>Deploy MISP (Malware Information Sharing Platform) to aggregate, correlate, and distribute threat intelligence feeds from multiple sources for centralized IOC management and automated SIEM integration.</description>
<location>project</location>
</skill>

<skill>
<name>building-threat-hunt-hypothesis-framework</name>
<description>Build a systematic threat hunt hypothesis framework that transforms threat intelligence, attack patterns, and environmental data into testable hunting hypotheses.</description>
<location>project</location>
</skill>

<skill>
<name>building-threat-intelligence-enrichment-in-splunk</name>
<description>Build automated threat intelligence enrichment pipelines in Splunk Enterprise Security using lookup tables, modular inputs, and the Threat Intelligence Framework.</description>
<location>project</location>
</skill>

<skill>
<name>building-threat-intelligence-feed-integration</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>building-threat-intelligence-platform</name>
<description>Building a Threat Intelligence Platform (TIP) involves deploying and integrating multiple CTI tools into a unified system for collecting, analyzing, enriching, and disseminating threat intelligence. T</description>
<location>project</location>
</skill>

<skill>
<name>building-vulnerability-aging-and-sla-tracking</name>
<description>Implement a vulnerability aging dashboard and SLA tracking system to measure remediation performance against severity-based timelines and drive accountability.</description>
<location>project</location>
</skill>

<skill>
<name>building-vulnerability-dashboard-with-defectdojo</name>
<description>Deploy DefectDojo as a centralized vulnerability management dashboard with scanner integrations, deduplication, metrics tracking, and Jira ticketing workflows.</description>
<location>project</location>
</skill>

<skill>
<name>building-vulnerability-exception-tracking-system</name>
<description>Build a vulnerability exception and risk acceptance tracking system with approval workflows, compensating controls documentation, and expiration management.</description>
<location>project</location>
</skill>

<skill>
<name>building-vulnerability-scanning-workflow</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>bypassing-authentication-with-forced-browsing</name>
<description>Discovering and accessing unprotected pages, APIs, and administrative interfaces by enumerating URLs and bypassing authentication controls during authorized security assessments.</description>
<location>project</location>
</skill>

<skill>
<name>collecting-indicators-of-compromise</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>collecting-open-source-intelligence</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>collecting-threat-intelligence-with-misp</name>
<description>MISP (Malware Information Sharing Platform) is an open-source threat intelligence platform for gathering, sharing, storing, and correlating Indicators of Compromise (IOCs) of targeted attacks, threat</description>
<location>project</location>
</skill>

<skill>
<name>collecting-volatile-evidence-from-compromised-host</name>
<description>Collect volatile forensic evidence from a compromised system following order of volatility, preserving memory, network connections, processes, and system state before they are lost.</description>
<location>project</location>
</skill>

<skill>
<name>conducting-api-security-testing</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>conducting-cloud-incident-response</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>conducting-cloud-penetration-testing</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>conducting-domain-persistence-with-dcsync</name>
<description>Perform DCSync attacks to replicate Active Directory credentials and establish domain persistence by extracting KRBTGT, Domain Admin, and service account hashes for Golden Ticket creation.</description>
<location>project</location>
</skill>

<skill>
<name>conducting-external-reconnaissance-with-osint</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>conducting-full-scope-red-team-engagement</name>
<description>Plan and execute a comprehensive red team engagement covering reconnaissance through post-exploitation using MITRE ATT&CK-aligned TTPs to evaluate an organization's detection and response capabilities.</description>
<location>project</location>
</skill>

<skill>
<name>conducting-internal-network-penetration-test</name>
<description>Execute an internal network penetration test simulating an insider threat or post-breach attacker to identify lateral movement paths, privilege escalation vectors, and sensitive data exposure within the corporate network.</description>
<location>project</location>
</skill>

<skill>
<name>conducting-internal-reconnaissance-with-bloodhound-ce</name>
<description>Conduct internal Active Directory reconnaissance using BloodHound Community Edition to map attack paths, identify privilege escalation chains, and discover misconfigurations in domain environments.</description>
<location>project</location>
</skill>

<skill>
<name>conducting-malware-incident-response</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>conducting-man-in-the-middle-attack-simulation</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>conducting-memory-forensics-with-volatility</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>conducting-mobile-app-penetration-test</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>conducting-network-penetration-test</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>conducting-pass-the-ticket-attack</name>
<description>Pass-the-Ticket (PtT) is a lateral movement technique that uses stolen Kerberos tickets (TGT or TGS) to authenticate to services without knowing the user's password. By extracting Kerberos tickets fro</description>
<location>project</location>
</skill>

<skill>
<name>conducting-phishing-incident-response</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>conducting-post-incident-lessons-learned</name>
<description>Facilitate structured post-incident reviews to identify root causes, document what worked and failed, and produce actionable recommendations to improve future incident response.</description>
<location>project</location>
</skill>

<skill>
<name>conducting-social-engineering-penetration-test</name>
<description>Design and execute a social engineering penetration test including phishing, vishing, smishing, and physical pretexting campaigns to measure human security resilience and identify training gaps.</description>
<location>project</location>
</skill>

<skill>
<name>conducting-social-engineering-pretext-call</name>
<description>Plan and execute authorized vishing (voice phishing) pretext calls to assess employee susceptibility to social engineering and evaluate security awareness controls.</description>
<location>project</location>
</skill>

<skill>
<name>conducting-spearphishing-simulation-campaign</name>
<description>Spearphishing simulation is a targeted social engineering attack vector used by red teams to gain initial access. Unlike broad phishing campaigns, spearphishing uses OSINT-derived intelligence to craf</description>
<location>project</location>
</skill>

<skill>
<name>conducting-wireless-network-penetration-test</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>configuring-active-directory-tiered-model</name>
<description>Implement Microsoft's Enhanced Security Admin Environment (ESAE) tiered administration model for Active Directory. Covers Tier 0/1/2 separation, privileged access workstations (PAWs), administrative f</description>
<location>project</location>
</skill>

<skill>
<name>configuring-aws-verified-access-for-ztna</name>
<description>Configure AWS Verified Access to provide VPN-less zero trust network access to internal applications using identity and device posture verification with Cedar policy language.</description>
<location>project</location>
</skill>

<skill>
<name>configuring-certificate-authority-with-openssl</name>
<description>A Certificate Authority (CA) is the trust anchor in a PKI hierarchy, responsible for issuing, signing, and revoking digital certificates. This skill covers building a two-tier CA hierarchy (Root CA +</description>
<location>project</location>
</skill>

<skill>
<name>configuring-host-based-intrusion-detection</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>configuring-hsm-for-key-storage</name>
<description>Hardware Security Modules (HSMs) are tamper-resistant physical devices that safeguard cryptographic keys and perform cryptographic operations in a hardened environment. Keys stored in an HSM never lea</description>
<location>project</location>
</skill>

<skill>
<name>configuring-identity-aware-proxy-with-google-iap</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>configuring-ldap-security-hardening</name>
<description>Harden LDAP directory services against common attacks including credential harvesting, LDAP injection, anonymous binding, and channel binding bypass. Covers LDAPS enforcement, channel binding, LDAP si</description>
<location>project</location>
</skill>

<skill>
<name>configuring-microsegmentation-for-zero-trust</name>
<description>Configure microsegmentation policies to enforce least-privilege workload-to-workload access using tools like VMware NSX, Illumio, and Calico, preventing lateral movement in zero trust architectures.</description>
<location>project</location>
</skill>

<skill>
<name>configuring-multi-factor-authentication-with-duo</name>
<description>Deploy Cisco Duo multi-factor authentication across enterprise applications, VPN, RDP, and SSH access points. This skill covers Duo integration methods, adaptive authentication policies, device trust</description>
<location>project</location>
</skill>

<skill>
<name>configuring-network-segmentation-with-vlans</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>configuring-oauth2-authorization-flow</name>
<description>Configure secure OAuth 2.0 authorization flows including Authorization Code with PKCE, Client Credentials, and Device Authorization Grant. This skill covers flow selection, PKCE implementation, token</description>
<location>project</location>
</skill>

<skill>
<name>configuring-pfsense-firewall-rules</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>configuring-snort-ids-for-intrusion-detection</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>configuring-suricata-for-network-monitoring</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>configuring-tls-1-3-for-secure-communications</name>
<description>TLS 1.3 (RFC 8446) is the latest version of the Transport Layer Security protocol, providing significant improvements over TLS 1.2 in both security and performance. It reduces handshake latency to 1-R</description>
<location>project</location>
</skill>

<skill>
<name>configuring-windows-defender-advanced-settings</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>configuring-windows-event-logging-for-detection</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>configuring-zscaler-private-access-for-ztna</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>containing-active-breach</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>correlating-security-events-in-qradar</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>correlating-threat-campaigns</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>deobfuscating-javascript-malware</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>deobfuscating-powershell-obfuscated-malware</name>
<description>Systematically deobfuscate multi-layer PowerShell malware using AST analysis, dynamic tracing, and tools like PSDecode and PowerDecode to reveal hidden payloads and C2 infrastructure.</description>
<location>project</location>
</skill>

<skill>
<name>deploying-active-directory-honeytokens</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>deploying-cloudflare-access-for-zero-trust</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>deploying-decoy-files-for-ransomware-detection</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>deploying-edr-agent-with-crowdstrike</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>deploying-osquery-for-endpoint-monitoring</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>deploying-palo-alto-prisma-access-zero-trust</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>deploying-ransomware-canary-files</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>deploying-software-defined-perimeter</name>
<description>Deploy a Software-Defined Perimeter using the CSA v2.0 specification with Single Packet Authorization, mutual TLS, and SDP controller/gateway configuration to enforce zero trust network access.</description>
<location>project</location>
</skill>

<skill>
<name>deploying-tailscale-for-zero-trust-vpn</name>
<description>Deploy and configure Tailscale as a WireGuard-based zero trust mesh VPN with identity-aware access controls, ACLs, and exit nodes for secure peer-to-peer connectivity.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-ai-model-prompt-injection-attacks</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-anomalies-in-industrial-control-systems</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-anomalous-authentication-patterns</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-api-enumeration-attacks</name>
<description>Detect and prevent API enumeration attacks including BOLA and IDOR exploitation by monitoring sequential identifier access patterns and authorization failures.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-arp-poisoning-in-network-traffic</name>
<description>Detect and prevent ARP spoofing attacks using ARPWatch, Dynamic ARP Inspection, Wireshark analysis, and custom monitoring scripts to protect against man-in-the-middle interception.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-attacks-on-historian-servers</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-attacks-on-scada-systems</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-aws-cloudtrail-anomalies</name>
<description>Detect unusual API call patterns in AWS CloudTrail logs using boto3, statistical baselining, and behavioral analysis to identify credential compromise, privilege escalation, and unauthorized resource access.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-aws-credential-exposure-with-trufflehog</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-aws-guardduty-findings-automation</name>
<description>Automate AWS GuardDuty threat detection findings processing using EventBridge and Lambda to enable real-time incident response, automatic quarantine of compromised resources, and security notification workflows.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-aws-iam-privilege-escalation</name>
<description>Detect AWS IAM privilege escalation paths using boto3 and Cloudsplaining policy analysis to identify overly permissive policies, dangerous permission combinations, and least-privilege violations</description>
<location>project</location>
</skill>

<skill>
<name>detecting-azure-lateral-movement</name>
<description>Detect lateral movement in Azure AD/Entra ID environments using Microsoft Graph API audit logs, Azure Sentinel KQL hunting queries, and sign-in anomaly correlation to identify privilege escalation, token theft, and cross-tenant pivoting.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-azure-service-principal-abuse</name>
<description>Detect and investigate Azure service principal abuse including privilege escalation, credential compromise, admin consent bypass, and unauthorized enumeration in Microsoft Entra ID environments.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-azure-storage-account-misconfigurations</name>
<description>Audit Azure Blob and ADLS storage accounts for public access exposure, weak or long-lived SAS tokens, missing encryption at rest, disabled HTTPS-only traffic, and outdated TLS versions using the azure-mgmt-storage Python SDK.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-beaconing-patterns-with-zeek</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-bluetooth-low-energy-attacks</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-broken-object-property-level-authorization</name>
<description>Detect and test for OWASP API3:2023 Broken Object Property Level Authorization vulnerabilities including excessive data exposure and mass assignment attacks.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-business-email-compromise</name>
<description>Business Email Compromise (BEC) is a sophisticated fraud scheme where attackers impersonate executives, vendors, or trusted partners to trick employees into transferring funds, sharing sensitive data,</description>
<location>project</location>
</skill>

<skill>
<name>detecting-business-email-compromise-with-ai</name>
<description>Deploy AI and NLP-powered detection systems to identify business email compromise attacks by analyzing writing style, behavioral patterns, and contextual anomalies that evade traditional rule-based filters.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-cloud-threats-with-guardduty</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-command-and-control-over-dns</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-compromised-cloud-credentials</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-container-drift-at-runtime</name>
<description>Detect unauthorized modifications to running containers by monitoring for binary execution drift, file system changes, and configuration deviations from the original container image.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-container-escape-attempts</name>
<description>Container escape is a critical attack technique where an adversary breaks out of container isolation to access the host system or other containers. Detection involves monitoring for escape indicators</description>
<location>project</location>
</skill>

<skill>
<name>detecting-container-escape-with-falco-rules</name>
<description>Detect container escape attempts in real-time using Falco runtime security rules that monitor syscalls, file access, and privilege escalation.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-credential-dumping-techniques</name>
<description>Detect LSASS credential dumping, SAM database extraction, and NTDS.dit theft using Sysmon Event ID 10, Windows Security logs, and SIEM correlation rules</description>
<location>project</location>
</skill>

<skill>
<name>detecting-cryptomining-in-cloud</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-dcsync-attack-in-active-directory</name>
<description>Detect DCSync attacks where adversaries abuse Active Directory replication privileges to extract password hashes by monitoring for non-domain-controller accounts requesting directory replication via DsGetNCChanges.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-deepfake-audio-in-vishing-attacks</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-dll-sideloading-attacks</name>
<description>Detect DLL side-loading attacks where adversaries place malicious DLLs alongside legitimate applications to hijack execution flow for defense evasion.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-dnp3-protocol-anomalies</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-dns-exfiltration-with-dns-query-analysis</name>
<description>Detect data exfiltration through DNS tunneling by analyzing query entropy, subdomain length, query volume, TXT record abuse, and response payload sizes using passive DNS monitoring.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-email-account-compromise</name>
<description>Detect compromised O365 and Google Workspace email accounts by analyzing inbox rule creation, suspicious sign-in locations, mail forwarding rules, and unusual API access patterns via Microsoft Graph and audit logs.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-email-forwarding-rules-attack</name>
<description>Detect malicious email forwarding rules created by adversaries to maintain persistent access to email communications for intelligence collection and BEC attacks.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-evasion-techniques-in-endpoint-logs</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-exfiltration-over-dns-with-zeek</name>
<description>Detect DNS-based data exfiltration by analyzing Zeek dns.log for high-entropy subdomains and anomalous query patterns</description>
<location>project</location>
</skill>

<skill>
<name>detecting-fileless-attacks-on-endpoints</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-fileless-malware-techniques</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-golden-ticket-attacks-in-kerberos-logs</name>
<description>Detect Golden Ticket attacks in Active Directory by analyzing Kerberos TGT anomalies including mismatched encryption types, impossible ticket lifetimes, non-existent accounts, and forged PAC signatures in domain controller event logs.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-golden-ticket-forgery</name>
<description>Detect Kerberos Golden Ticket forgery by analyzing Windows Event ID 4769 for RC4 encryption downgrades (0x17), abnormal ticket lifetimes, and krbtgt account anomalies in Splunk and Elastic SIEM</description>
<location>project</location>
</skill>

<skill>
<name>detecting-insider-data-exfiltration-via-dlp</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-insider-threat-behaviors</name>
<description>Detect insider threat behavioral indicators including unusual data access, off-hours activity, mass file downloads, privilege abuse, and resignation-correlated data theft.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-insider-threat-with-ueba</name>
<description>Implement User and Entity Behavior Analytics using Elasticsearch/OpenSearch to build behavioral baselines, calculate anomaly scores, perform peer group analysis, and detect insider threat indicators such as data exfiltration, privilege abuse, and unauthorized access patterns.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-kerberoasting-attacks</name>
<description>Detect Kerberoasting attacks by monitoring for anomalous Kerberos TGS requests targeting service accounts with SPNs for offline password cracking.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-lateral-movement-in-network</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-lateral-movement-with-splunk</name>
<description>Detect adversary lateral movement across networks using Splunk SPL queries against Windows authentication logs, SMB traffic, and remote service abuse.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-lateral-movement-with-zeek</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-living-off-the-land-attacks</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-living-off-the-land-with-lolbas</name>
<description>Detect Living Off the Land Binaries (LOLBins/LOLBAS) abuse including certutil, regsvr32, mshta, and rundll32 via process telemetry, Sigma rules, and parent-child process analysis</description>
<location>project</location>
</skill>

<skill>
<name>detecting-malicious-scheduled-tasks-with-sysmon</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-mimikatz-execution-patterns</name>
<description>Detect Mimikatz execution through command-line patterns, LSASS access signatures, binary indicators, and in-memory detection of known modules.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-misconfigured-azure-storage</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-mobile-malware-behavior</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-modbus-command-injection-attacks</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-modbus-protocol-anomalies</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-network-anomalies-with-zeek</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-network-scanning-with-ids-signatures</name>
<description>Detect network reconnaissance and port scanning using Suricata and Snort IDS signatures, threshold-based detection rules, and traffic anomaly analysis to identify Nmap, Masscan, and custom scanning activity.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-ntlm-relay-with-event-correlation</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-oauth-token-theft</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-pass-the-hash-attacks</name>
<description>Detect Pass-the-Hash attacks by analyzing NTLM authentication patterns, identifying Type 3 logons with NTLM where Kerberos is expected, and correlating with credential dumping.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-pass-the-ticket-attacks</name>
<description>Detect Kerberos Pass-the-Ticket (PtT) attacks by analyzing Windows Event IDs 4768, 4769, and 4771 for anomalous ticket usage patterns in Splunk and Elastic SIEM</description>
<location>project</location>
</skill>

<skill>
<name>detecting-port-scanning-with-fail2ban</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-privilege-escalation-attempts</name>
<description>Detect privilege escalation attempts including token manipulation, UAC bypass, unquoted service paths, kernel exploits, and sudo/doas abuse across Windows and Linux.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-privilege-escalation-in-kubernetes-pods</name>
<description>Detect and prevent privilege escalation in Kubernetes pods by monitoring security contexts, capabilities, and syscall patterns with Falco and OPA policies.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-process-hollowing-technique</name>
<description>Detect process hollowing (T1055.012) by analyzing memory-mapped sections, hollowed process indicators, and parent-child process anomalies in EDR telemetry.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-process-injection-techniques</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-qr-code-phishing-with-email-security</name>
<description>Detect and prevent QR code phishing (quishing) attacks that bypass traditional email security by embedding malicious URLs in QR code images within emails.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-ransomware-encryption-behavior</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-ransomware-precursors-in-network</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-rdp-brute-force-attacks</name>
<description>Detect RDP brute force attacks by analyzing Windows Security Event Logs for failed authentication patterns (Event ID 4625), successful logons after failures (Event ID 4624), NLA failures, and source IP frequency analysis.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-rootkit-activity</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-s3-data-exfiltration-attempts</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-serverless-function-injection</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-service-account-abuse</name>
<description>Detect abuse of service accounts through anomalous interactive logons, privilege escalation, lateral movement, and unauthorized access patterns.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-shadow-api-endpoints</name>
<description>Discover and inventory shadow API endpoints that operate outside documented specifications using traffic analysis, code scanning, and API discovery platforms.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-shadow-it-cloud-usage</name>
<description>Detect unauthorized SaaS and cloud service usage (shadow IT) by analyzing proxy logs, DNS query logs, and netflow data using Python pandas for traffic pattern analysis and domain classification.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-spearphishing-with-email-gateway</name>
<description>Spearphishing targets specific individuals using personalized, researched content that bypasses generic spam filters. Email security gateways (SEGs) like Microsoft Defender for Office 365, Proofpoint,</description>
<location>project</location>
</skill>

<skill>
<name>detecting-sql-injection-via-waf-logs</name>
<description>>-</description>
<location>project</location>
</skill>

<skill>
<name>detecting-stuxnet-style-attacks</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-supply-chain-attacks-in-ci-cd</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-suspicious-oauth-application-consent</name>
<description>Detect risky OAuth application consent grants in Azure AD / Microsoft Entra ID using Microsoft Graph API, audit logs, and permission analysis to identify illicit consent grant attacks.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-suspicious-powershell-execution</name>
<description>Detect suspicious PowerShell execution patterns including encoded commands, download cradles, AMSI bypass attempts, and constrained language mode evasion.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-t1003-credential-dumping-with-edr</name>
<description>Detect OS credential dumping techniques targeting LSASS memory, SAM database, NTDS.dit, and cached credentials using EDR telemetry, Sysmon process access monitoring, and Windows security event correlation.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-t1055-process-injection-with-sysmon</name>
<description>Detect process injection techniques (T1055) including classic DLL injection, process hollowing, and APC injection by analyzing Sysmon events for cross-process memory operations, remote thread creation, and anomalous DLL loading patterns.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-t1548-abuse-elevation-control-mechanism</name>
<description>Detect abuse of elevation control mechanisms including UAC bypass, sudo exploitation, and setuid/setgid manipulation by monitoring registry modifications, process elevation flags, and unusual parent-child process relationships.</description>
<location>project</location>
</skill>

<skill>
<name>detecting-typosquatting-packages-in-npm-pypi</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>detecting-wmi-persistence</name>
<description>Detect WMI event subscription persistence by analyzing Sysmon Event IDs 19, 20, and 21 for malicious EventFilter, EventConsumer, and FilterToConsumerBinding creation.</description>
<location>project</location>
</skill>

<skill>
<name>eradicating-malware-from-infected-systems</name>
<description>Systematically remove malware, backdoors, and attacker persistence mechanisms from infected systems while ensuring complete eradication and preventing re-infection.</description>
<location>project</location>
</skill>

<skill>
<name>evaluating-threat-intelligence-platforms</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>executing-active-directory-attack-simulation</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>executing-phishing-simulation-campaign</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>executing-red-team-engagement-planning</name>
<description>Red team engagement planning is the foundational phase that defines scope, objectives, rules of engagement (ROE), threat model selection, and operational timelines before any offensive testing begins.</description>
<location>project</location>
</skill>

<skill>
<name>executing-red-team-exercise</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>exploiting-active-directory-certificate-services-esc1</name>
<description>Exploit misconfigured Active Directory Certificate Services (AD CS) ESC1 vulnerability to request certificates as high-privileged users and escalate domain privileges during authorized red team assessments.</description>
<location>project</location>
</skill>

<skill>
<name>exploiting-active-directory-with-bloodhound</name>
<description>BloodHound is a graph-based Active Directory reconnaissance tool that uses graph theory to reveal hidden and unintended relationships within AD environments. Red teams use BloodHound to identify attac</description>
<location>project</location>
</skill>

<skill>
<name>exploiting-api-injection-vulnerabilities</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>exploiting-bgp-hijacking-vulnerabilities</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>exploiting-broken-function-level-authorization</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>exploiting-broken-link-hijacking</name>
<description>Discover and exploit broken link hijacking vulnerabilities by identifying references to expired domains, decommissioned cloud resources, and dead external services that can be claimed by an attacker.</description>
<location>project</location>
</skill>

<skill>
<name>exploiting-constrained-delegation-abuse</name>
<description>Exploit Kerberos Constrained Delegation misconfigurations in Active Directory to impersonate privileged users via S4U2self and S4U2proxy extensions for lateral movement and privilege escalation.</description>
<location>project</location>
</skill>

<skill>
<name>exploiting-deeplink-vulnerabilities</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>exploiting-excessive-data-exposure-in-api</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>exploiting-http-request-smuggling</name>
<description>Detecting and exploiting HTTP request smuggling vulnerabilities caused by Content-Length and Transfer-Encoding parsing discrepancies between front-end and back-end servers.</description>
<location>project</location>
</skill>

<skill>
<name>exploiting-idor-vulnerabilities</name>
<description>Identifying and exploiting Insecure Direct Object Reference vulnerabilities to access unauthorized resources by manipulating object identifiers in API requests and URLs.</description>
<location>project</location>
</skill>

<skill>
<name>exploiting-insecure-data-storage-in-mobile</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>exploiting-insecure-deserialization</name>
<description>Identifying and exploiting insecure deserialization vulnerabilities in Java, PHP, Python, and .NET applications to achieve remote code execution during authorized penetration tests.</description>
<location>project</location>
</skill>

<skill>
<name>exploiting-ipv6-vulnerabilities</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>exploiting-jwt-algorithm-confusion-attack</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>exploiting-kerberoasting-with-impacket</name>
<description>Perform Kerberoasting attacks using Impacket's GetUserSPNs to extract and crack Kerberos TGS tickets for Active Directory service accounts.</description>
<location>project</location>
</skill>

<skill>
<name>exploiting-mass-assignment-in-rest-apis</name>
<description>Discover and exploit mass assignment vulnerabilities in REST APIs to escalate privileges, modify restricted fields, and bypass authorization controls by injecting unexpected parameters in API requests.</description>
<location>project</location>
</skill>

<skill>
<name>exploiting-ms17-010-eternalblue-vulnerability</name>
<description>MS17-010 (EternalBlue) is a critical vulnerability in Microsoft's SMBv1 implementation that allows remote code execution. Originally discovered by the NSA and leaked by the Shadow Brokers in 2017, it</description>
<location>project</location>
</skill>

<skill>
<name>exploiting-nopac-cve-2021-42278-42287</name>
<description>Exploit the noPac vulnerability chain (CVE-2021-42278 sAMAccountName spoofing and CVE-2021-42287 KDC PAC confusion) to escalate from standard domain user to Domain Admin in Active Directory environments.</description>
<location>project</location>
</skill>

<skill>
<name>exploiting-nosql-injection-vulnerabilities</name>
<description>Detect and exploit NoSQL injection vulnerabilities in MongoDB, CouchDB, and other NoSQL databases to demonstrate authentication bypass, data extraction, and unauthorized access risks.</description>
<location>project</location>
</skill>

<skill>
<name>exploiting-oauth-misconfiguration</name>
<description>Identifying and exploiting OAuth 2.0 and OpenID Connect misconfigurations including redirect URI manipulation, token leakage, and authorization code theft during security assessments.</description>
<location>project</location>
</skill>

<skill>
<name>exploiting-prototype-pollution-in-javascript</name>
<description>Detect and exploit JavaScript prototype pollution vulnerabilities on both client-side and server-side applications to achieve XSS, RCE, and authentication bypass through property injection.</description>
<location>project</location>
</skill>

<skill>
<name>exploiting-race-condition-vulnerabilities</name>
<description>Detect and exploit race condition vulnerabilities in web applications using Turbo Intruder's single-packet attack technique to bypass rate limits, duplicate transactions, and exploit time-of-check-to-time-of-use flaws.</description>
<location>project</location>
</skill>

<skill>
<name>exploiting-server-side-request-forgery</name>
<description>Identifying and exploiting SSRF vulnerabilities to access internal services, cloud metadata, and restricted network resources during authorized penetration tests.</description>
<location>project</location>
</skill>

<skill>
<name>exploiting-smb-vulnerabilities-with-metasploit</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>exploiting-sql-injection-vulnerabilities</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>exploiting-sql-injection-with-sqlmap</name>
<description>Detecting and exploiting SQL injection vulnerabilities using sqlmap to extract database contents during authorized penetration tests.</description>
<location>project</location>
</skill>

<skill>
<name>exploiting-template-injection-vulnerabilities</name>
<description>Detecting and exploiting Server-Side Template Injection (SSTI) vulnerabilities across Jinja2, Twig, Freemarker, and other template engines to achieve remote code execution.</description>
<location>project</location>
</skill>

<skill>
<name>exploiting-type-juggling-vulnerabilities</name>
<description>Exploit PHP type juggling vulnerabilities caused by loose comparison operators to bypass authentication, circumvent hash verification, and manipulate application logic through type coercion attacks.</description>
<location>project</location>
</skill>

<skill>
<name>exploiting-vulnerabilities-with-metasploit-framework</name>
<description>The Metasploit Framework is the world's most widely used penetration testing platform, maintained by Rapid7. It contains over 2,300 exploits, 1,200 auxiliary modules, and 400 post-exploitation modules</description>
<location>project</location>
</skill>

<skill>
<name>exploiting-websocket-vulnerabilities</name>
<description>Testing WebSocket implementations for authentication bypass, cross-site hijacking, injection attacks, and insecure message handling during authorized security assessments.</description>
<location>project</location>
</skill>

<skill>
<name>exploiting-zerologon-vulnerability-cve-2020-1472</name>
<description>Exploit the Zerologon vulnerability (CVE-2020-1472) in the Netlogon Remote Protocol to achieve domain controller compromise by resetting the machine account password to empty.</description>
<location>project</location>
</skill>

<skill>
<name>extracting-browser-history-artifacts</name>
<description>Extract and analyze browser history, cookies, cache, downloads, and bookmarks from Chrome, Firefox, and Edge for forensic evidence of user web activity.</description>
<location>project</location>
</skill>

<skill>
<name>extracting-config-from-agent-tesla-rat</name>
<description>Extract embedded configuration from Agent Tesla RAT samples including SMTP/FTP/Telegram exfiltration credentials, keylogger settings, and C2 endpoints using .NET decompilation and memory analysis.</description>
<location>project</location>
</skill>

<skill>
<name>extracting-credentials-from-memory-dump</name>
<description>Extract cached credentials, password hashes, Kerberos tickets, and authentication tokens from memory dumps using Volatility and Mimikatz for forensic investigation.</description>
<location>project</location>
</skill>

<skill>
<name>extracting-iocs-from-malware-samples</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>extracting-memory-artifacts-with-rekall</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>extracting-windows-event-logs-artifacts</name>
<description>Extract, parse, and analyze Windows Event Logs (EVTX) using Chainsaw, Hayabusa, and EvtxECmd to detect lateral movement, persistence, and privilege escalation.</description>
<location>project</location>
</skill>

<skill>
<name>generating-threat-intelligence-reports</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>hardening-docker-containers-for-production</name>
<description>Hardening Docker containers for production involves applying security best practices aligned with CIS Docker Benchmark v1.8.0 to minimize attack surface, prevent privilege escalation, and enforce leas</description>
<location>project</location>
</skill>

<skill>
<name>hardening-docker-daemon-configuration</name>
<description>Harden the Docker daemon by configuring daemon.json with user namespace remapping, TLS authentication, rootless mode, and CIS benchmark controls.</description>
<location>project</location>
</skill>

<skill>
<name>hardening-linux-endpoint-with-cis-benchmark</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>hardening-windows-endpoint-with-cis-benchmark</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>hunting-advanced-persistent-threats</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>hunting-credential-stuffing-attacks</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-anomalous-powershell-execution</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-beaconing-with-frequency-analysis</name>
<description>Identify command-and-control beaconing patterns in network traffic by applying statistical frequency analysis, jitter calculation, and coefficient of variation scoring to detect periodic callbacks from compromised endpoints.</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-cobalt-strike-beacons</name>
<description>Detect Cobalt Strike beacon network activity using default TLS certificate signatures (serial 8BB00EE), JA3/JA3S/JARM fingerprints, HTTP C2 profile pattern matching, beacon jitter analysis, and named pipe detection via Zeek, Suricata, and Python PCAP analysis.</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-command-and-control-beaconing</name>
<description>Detect C2 beaconing patterns in network traffic using frequency analysis, jitter detection, and domain reputation to identify compromised endpoints communicating with adversary infrastructure.</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-data-exfiltration-indicators</name>
<description>Hunt for data exfiltration through network traffic analysis, detecting unusual data flows, DNS tunneling, cloud storage uploads, and encrypted channel abuse.</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-data-staging-before-exfiltration</name>
<description>Detect data staging activity before exfiltration by monitoring for archive creation with 7-Zip/RAR, unusual temp folder access, large file consolidation, and staging directory patterns via EDR and process telemetry</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-dcom-lateral-movement</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-dcsync-attacks</name>
<description>Detect DCSync attacks by analyzing Windows Event ID 4662 for unauthorized DS-Replication-Get-Changes requests from non-domain-controller accounts.</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-defense-evasion-via-timestomping</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-dns-based-persistence</name>
<description>Hunt for DNS-based persistence mechanisms including DNS hijacking, dangling CNAME records, wildcard DNS abuse, and unauthorized zone modifications using passive DNS databases, SecurityTrails API, and DNS audit log analysis.</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-dns-tunneling-with-zeek</name>
<description>Detect DNS tunneling and data exfiltration by analyzing Zeek dns.log for high-entropy subdomain queries, excessive query volume, long query lengths, and unusual DNS record types indicating covert channel communication.</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-domain-fronting-c2-traffic</name>
<description>Detect domain fronting C2 traffic by analyzing SNI vs HTTP Host header mismatches in proxy logs and TLS certificate discrepancies using pyOpenSSL for certificate inspection</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-lateral-movement-via-wmi</name>
<description>Detect WMI-based lateral movement by analyzing Windows Event ID 4688 process creation and Sysmon Event ID 1 for WmiPrvSE.exe child process patterns, remote process execution, and WMI event subscription persistence.</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-living-off-the-cloud-techniques</name>
<description>Hunt for adversary abuse of legitimate cloud services for C2, data staging, and exfiltration including abuse of Azure, AWS, GCP services, and SaaS platforms.</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-living-off-the-land-binaries</name>
<description>Proactively hunt for adversary abuse of legitimate system binaries (LOLBins) to execute malicious payloads while evading detection.</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-lolbins-execution-in-endpoint-logs</name>
<description>Hunt for adversary abuse of Living Off the Land Binaries (LOLBins) by analyzing endpoint process creation logs for suspicious execution patterns of legitimate Windows system binaries used for malicious purposes.</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-ntlm-relay-attacks</name>
<description>Detect NTLM relay attacks by analyzing Windows Event 4624 logon type 3 with NTLMSSP authentication, identifying IP-to-hostname mismatches, Responder traffic signatures, SMB signing status, and suspicious authentication patterns across the domain.</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-persistence-mechanisms-in-windows</name>
<description>Systematically hunt for adversary persistence mechanisms across Windows endpoints including registry, services, startup folders, and WMI subscriptions.</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-persistence-via-wmi-subscriptions</name>
<description>Hunt for adversary persistence through Windows Management Instrumentation event subscriptions by monitoring WMI consumer, filter, and binding creation events that execute malicious code triggered by system events.</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-process-injection-techniques</name>
<description>Detect process injection techniques (T1055) including CreateRemoteThread, process hollowing, and DLL injection via Sysmon Event IDs 8 and 10 and EDR process telemetry</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-registry-persistence-mechanisms</name>
<description>Hunt for registry-based persistence mechanisms including Run keys, Winlogon modifications, IFEO injection, and COM hijacking in Windows environments.</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-registry-run-key-persistence</name>
<description>Detect MITRE ATT&CK T1547.001 registry Run key persistence by analyzing Sysmon Event ID 13 logs and registry queries to identify malicious auto-start entries.</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-scheduled-task-persistence</name>
<description>Hunt for adversary persistence via Windows Scheduled Tasks by analyzing task creation events, suspicious task actions, and unusual scheduling patterns.</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-shadow-copy-deletion</name>
<description>Hunt for Volume Shadow Copy deletion activity that indicates ransomware preparation or anti-forensics by monitoring vssadmin, wmic, and PowerShell shadow copy commands.</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-spearphishing-indicators</name>
<description>Hunt for spearphishing campaign indicators across email logs, endpoint telemetry, and network data to detect targeted email attacks.</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-startup-folder-persistence</name>
<description>Detect T1547.001 startup folder persistence by monitoring Windows startup directories for suspicious file creation, analyzing autoruns entries, and using Python watchdog for real-time filesystem monitoring.</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-supply-chain-compromise</name>
<description>Hunt for supply chain compromise indicators including trojanized software updates, compromised dependencies, unauthorized code modifications, and tampered build artifacts.</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-suspicious-scheduled-tasks</name>
<description>Hunt for adversary persistence and execution via Windows scheduled tasks by analyzing task creation events, suspicious task properties, and unusual execution patterns that indicate T1053.005 abuse.</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-t1098-account-manipulation</name>
<description>Hunt for MITRE ATT&CK T1098 account manipulation including shadow admin creation, SID history injection, group membership changes, and credential modifications using Windows Security Event Logs.</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-unusual-network-connections</name>
<description>Hunt for unusual network connections by analyzing outbound traffic patterns, rare destinations, non-standard ports, and anomalous connection frequencies from endpoints.</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-unusual-service-installations</name>
<description>Detect suspicious Windows service installations (MITRE ATT&CK T1543.003) by parsing System event logs for Event ID 7045, analyzing service binary paths, and identifying indicators of persistence mechanisms.</description>
<location>project</location>
</skill>

<skill>
<name>hunting-for-webshell-activity</name>
<description>Hunt for web shell deployments on internet-facing servers by analyzing file creation in web directories, suspicious process spawning from web servers, and anomalous HTTP patterns.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-aes-encryption-for-data-at-rest</name>
<description>AES (Advanced Encryption Standard) is a symmetric block cipher standardized by NIST (FIPS 197) used to protect classified and sensitive data. This skill covers implementing AES-256 encryption in GCM m</description>
<location>project</location>
</skill>

<skill>
<name>implementing-alert-fatigue-reduction</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-anti-phishing-training-program</name>
<description>Security awareness training is the human layer of phishing defense. An effective anti-phishing training program combines regular simulations, interactive learning modules, metric tracking, and positiv</description>
<location>project</location>
</skill>

<skill>
<name>implementing-anti-ransomware-group-policy</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-api-abuse-detection-with-rate-limiting</name>
<description>Implement API abuse detection using token bucket, sliding window, and adaptive rate limiting algorithms to prevent DDoS, brute force, and credential stuffing attacks.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-api-gateway-security-controls</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-api-key-security-controls</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-api-rate-limiting-and-throttling</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-api-schema-validation-security</name>
<description>Implement API schema validation using OpenAPI specifications and JSON Schema to enforce input/output contracts and prevent injection, data exposure, and mass assignment attacks.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-api-security-posture-management</name>
<description>Implement API Security Posture Management to continuously discover, classify, and score APIs based on risk while enforcing security policies across the API lifecycle.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-api-security-testing-with-42crunch</name>
<description>Implement comprehensive API security testing using the 42Crunch platform to perform static audit and dynamic conformance scanning of OpenAPI specifications.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-api-threat-protection-with-apigee</name>
<description>Implement API threat protection using Google Apigee policies including JSON/XML threat protection, OAuth 2.0, SpikeArrest, and Advanced API Security for OWASP Top 10 defense.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-application-whitelisting-with-applocker</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-aqua-security-for-container-scanning</name>
<description>Deploy Aqua Security's Trivy scanner to detect vulnerabilities, misconfigurations, secrets, and license issues in container images across CI/CD pipelines and registries.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-attack-path-analysis-with-xm-cyber</name>
<description>Deploy XM Cyber's continuous exposure management platform to map attack paths, identify choke points, and prioritize the 2% of exposures that threaten critical assets.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-attack-surface-management</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-aws-config-rules-for-compliance</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-aws-iam-permission-boundaries</name>
<description>Configure IAM permission boundaries in AWS to delegate role creation to developers while enforcing maximum privilege limits set by the security team.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-aws-macie-for-data-classification</name>
<description>Implement Amazon Macie to automatically discover, classify, and protect sensitive data in S3 buckets using machine learning and pattern matching for PII, financial data, and credentials detection.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-aws-nitro-enclave-security</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-aws-security-hub</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-aws-security-hub-compliance</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-azure-ad-privileged-identity-management</name>
<description>Configure Microsoft Entra Privileged Identity Management to enforce just-in-time role activation, approval workflows, and access reviews for Azure AD privileged roles.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-azure-defender-for-cloud</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-beyondcorp-zero-trust-access-model</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-bgp-security-with-rpki</name>
<description>Implement BGP route origin validation using RPKI with Route Origin Authorizations, RPKI-to-Router protocol, and ROV policies on Cisco and Juniper routers to prevent route hijacking.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-browser-isolation-for-zero-trust</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-canary-tokens-for-network-intrusion</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-cisa-zero-trust-maturity-model</name>
<description>Implement the CISA Zero Trust Maturity Model v2.0 across the five pillars of identity, devices, networks, applications, and data to achieve progressive organizational zero trust maturity.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-cloud-dlp-for-data-protection</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-cloud-security-posture-management</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-cloud-trail-log-analysis</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-cloud-vulnerability-posture-management</name>
<description>Implement Cloud Security Posture Management using AWS Security Hub, Azure Defender for Cloud, and open-source tools like Prowler and ScoutSuite for multi-cloud vulnerability detection.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-cloud-waf-rules</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-cloud-workload-protection</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-code-signing-for-artifacts</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-conditional-access-policies-azure-ad</name>
<description>Configure Microsoft Entra ID (Azure AD) Conditional Access policies for zero trust access control. Covers signal-based policy design, device compliance requirements, risk-based authentication, named l</description>
<location>project</location>
</skill>

<skill>
<name>implementing-conduit-security-for-ot-remote-access</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-container-image-minimal-base-with-distroless</name>
<description>Reduce container attack surface by building application images on Google distroless base images that contain only the application runtime with no shell, package manager, or unnecessary OS utilities.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-container-network-policies-with-calico</name>
<description>Enforce Kubernetes network segmentation using Calico CNI network policies and global network policies to control pod-to-pod traffic, restrict egress, and implement zero-trust microsegmentation.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-continuous-security-validation-with-bas</name>
<description>Deploy Breach and Attack Simulation tools to continuously validate security control effectiveness by safely emulating real-world attack techniques across the kill chain.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-data-loss-prevention-with-microsoft-purview</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-ddos-mitigation-with-cloudflare</name>
<description>Configure Cloudflare DDoS protection with managed rulesets, rate limiting, WAF rules, Bot Management, and origin protection to mitigate volumetric, protocol, and application-layer attacks.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-deception-based-detection-with-canarytoken</name>
<description>Deploy and monitor Canary Tokens via the Thinkst Canary API for deception-based breach detection using web bug tokens, DNS tokens, document tokens, and AWS key tokens.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-delinea-secret-server-for-pam</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-device-posture-assessment-in-zero-trust</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-devsecops-security-scanning</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-diamond-model-analysis</name>
<description>>-</description>
<location>project</location>
</skill>

<skill>
<name>implementing-digital-signatures-with-ed25519</name>
<description>Ed25519 is a high-performance digital signature algorithm using the Edwards curve Curve25519. It provides 128-bit security with 64-byte signatures and 32-byte keys, offering significant advantages ove</description>
<location>project</location>
</skill>

<skill>
<name>implementing-disk-encryption-with-bitlocker</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-dmarc-dkim-spf-email-security</name>
<description>SPF, DKIM, and DMARC form the three pillars of email authentication. Together they prevent domain spoofing, validate message integrity, and define policies for handling unauthenticated mail. Proper im</description>
<location>project</location>
</skill>

<skill>
<name>implementing-dragos-platform-for-ot-monitoring</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-ebpf-security-monitoring</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-email-sandboxing-with-proofpoint</name>
<description>Email sandboxing detonates suspicious attachments and URLs in isolated environments to detect zero-day malware and evasive phishing payloads. Proofpoint Targeted Attack Protection (TAP) is an industry</description>
<location>project</location>
</skill>

<skill>
<name>implementing-end-to-end-encryption-for-messaging</name>
<description>End-to-end encryption (E2EE) ensures that only the communicating parties can read messages, with no intermediary (including the server) able to decrypt them. This skill implements a simplified version</description>
<location>project</location>
</skill>

<skill>
<name>implementing-endpoint-detection-with-wazuh</name>
<description>Deploy and configure Wazuh SIEM/XDR for endpoint detection including agent management, custom decoder and rule XML creation, alert querying via the Wazuh REST API, and automated response actions.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-endpoint-dlp-controls</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-envelope-encryption-with-aws-kms</name>
<description>Envelope encryption is a strategy where data is encrypted with a data encryption key (DEK), and the DEK itself is encrypted with a master key (KEK) managed by AWS KMS. This approach allows encrypting</description>
<location>project</location>
</skill>

<skill>
<name>implementing-epss-score-for-vulnerability-prioritization</name>
<description>Integrate FIRST's Exploit Prediction Scoring System (EPSS) API to prioritize vulnerability remediation based on real-world exploitation probability within 30 days.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-file-integrity-monitoring-with-aide</name>
<description>Configure AIDE (Advanced Intrusion Detection Environment) for file integrity monitoring including baseline creation, scheduled integrity checks, change detection, and alerting</description>
<location>project</location>
</skill>

<skill>
<name>implementing-fuzz-testing-in-cicd-with-aflplusplus</name>
<description>Integrate AFL++ coverage-guided fuzz testing into CI/CD pipelines to discover memory corruption, input handling, and logic vulnerabilities in C/C++ and compiled applications.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-gcp-binary-authorization</name>
<description>Implement GCP Binary Authorization to enforce deploy-time security controls that ensure only trusted, attested container images are deployed to Google Kubernetes Engine and Cloud Run.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-gcp-organization-policy-constraints</name>
<description>Implement GCP Organization Policy constraints to enforce security guardrails across the entire resource hierarchy, restricting risky configurations and ensuring compliance at organization, folder, and project levels.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-gcp-vpc-firewall-rules</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-gdpr-data-protection-controls</name>
<description>The General Data Protection Regulation (EU) 2016/679 (GDPR) is the EU's comprehensive data protection law governing the collection, processing, storage, and transfer of personal data. This skill cover</description>
<location>project</location>
</skill>

<skill>
<name>implementing-gdpr-data-subject-access-request</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-github-advanced-security-for-code-scanning</name>
<description>Configure GitHub Advanced Security with CodeQL to perform automated static analysis and vulnerability detection across repositories at enterprise scale.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-google-workspace-admin-security</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-google-workspace-phishing-protection</name>
<description>Configure Google Workspace advanced phishing and malware protection settings including pre-delivery scanning, attachment protection, spoofing detection, and Enhanced Safe Browsing.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-google-workspace-sso-configuration</name>
<description>Configure SAML 2.0 single sign-on for Google Workspace with a third-party identity provider, enabling centralized authentication and enforcing organization-wide access policies.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-hardware-security-key-authentication</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-hashicorp-vault-dynamic-secrets</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-honeypot-for-ransomware-detection</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-honeytokens-for-breach-detection</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-ics-firewall-with-tofino</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-identity-governance-with-sailpoint</name>
<description>Deploy SailPoint IdentityNow or IdentityIQ for identity governance and administration. Covers identity lifecycle management, access request workflows, certification campaigns, role mining, SOD policy</description>
<location>project</location>
</skill>

<skill>
<name>implementing-identity-verification-for-zero-trust</name>
<description>Implement continuous identity verification for zero trust using phishing-resistant MFA (FIDO2/WebAuthn), risk-based conditional access, and identity governance aligned with the CISA Zero Trust Maturity Model.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-iec-62443-security-zones</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-image-provenance-verification-with-cosign</name>
<description>Sign and verify container image provenance using Sigstore Cosign with keyless OIDC-based signing, attestations, and Kubernetes admission enforcement.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-immutable-backup-with-restic</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-infrastructure-as-code-security-scanning</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-iso-27001-information-security-management</name>
<description>ISO/IEC 27001:2022 is the international standard for establishing, implementing, maintaining, and continually improving an Information Security Management System (ISMS). This skill covers the complete</description>
<location>project</location>
</skill>

<skill>
<name>implementing-just-in-time-access-provisioning</name>
<description>Implement Just-In-Time (JIT) access provisioning to eliminate standing privileges by granting temporary, time-bound access only when needed. This skill covers JIT architecture design, approval workflo</description>
<location>project</location>
</skill>

<skill>
<name>implementing-jwt-signing-and-verification</name>
<description>JSON Web Tokens (JWT) defined in RFC 7519 are compact, URL-safe tokens used for authentication and authorization in web applications. This skill covers implementing secure JWT signing with HMAC-SHA256</description>
<location>project</location>
</skill>

<skill>
<name>implementing-kubernetes-network-policy-with-calico</name>
<description>Implement Kubernetes network segmentation using Calico NetworkPolicy and GlobalNetworkPolicy for zero-trust pod-to-pod communication.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-kubernetes-pod-security-standards</name>
<description>Pod Security Standards (PSS) define three levels of security policies -- Privileged, Baseline, and Restricted -- enforced by the Pod Security Admission (PSA) controller built into Kubernetes 1.25+. PS</description>
<location>project</location>
</skill>

<skill>
<name>implementing-llm-guardrails-for-security</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-log-forwarding-with-fluentd</name>
<description>Configure Fluentd and Fluent Bit for centralized log aggregation, routing, filtering, and enrichment across distributed infrastructure</description>
<location>project</location>
</skill>

<skill>
<name>implementing-log-integrity-with-blockchain</name>
<description>>-</description>
<location>project</location>
</skill>

<skill>
<name>implementing-memory-protection-with-dep-aslr</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-microsegmentation-with-guardicore</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-mimecast-targeted-attack-protection</name>
<description>Deploy Mimecast Targeted Threat Protection including URL Protect, Attachment Protect, Impersonation Protect, and Internal Email Protect to defend against advanced phishing and spearphishing attacks.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-mitre-attack-coverage-mapping</name>
<description>Implement MITRE ATT&CK coverage mapping to identify detection gaps, prioritize rule development, and measure SOC detection maturity against adversary techniques.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-mobile-application-management</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-mtls-for-zero-trust-services</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-nerc-cip-compliance-controls</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-network-access-control</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-network-access-control-with-cisco-ise</name>
<description>Deploy Cisco Identity Services Engine for 802.1X wired and wireless authentication, MAC Authentication Bypass, posture assessment, and dynamic VLAN assignment for network access control.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-network-deception-with-honeypots</name>
<description>Deploy and manage network honeypots using OpenCanary, T-Pot, or Cowrie to detect unauthorized access, lateral movement, and attacker reconnaissance.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-network-intrusion-prevention-with-suricata</name>
<description>Deploy and configure Suricata as a network intrusion prevention system with custom rules, Emerging Threats rulesets, and inline traffic inspection for real-time threat blocking.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-network-policies-for-kubernetes</name>
<description>Kubernetes NetworkPolicies provide pod-level network segmentation by defining ingress and egress rules that control traffic flow between pods, namespaces, and external endpoints. Combined with CNI plu</description>
<location>project</location>
</skill>

<skill>
<name>implementing-network-segmentation-for-ot</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-network-segmentation-with-firewall-zones</name>
<description>Design and implement network segmentation using firewall security zones, VLANs, ACLs, and microsegmentation policies to restrict lateral movement and enforce least-privilege network access.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-network-traffic-analysis-with-arkime</name>
<description>>-</description>
<location>project</location>
</skill>

<skill>
<name>implementing-network-traffic-baselining</name>
<description>Build network traffic baselines from NetFlow/IPFIX data using Python pandas for statistical analysis, z-score anomaly detection, and hourly/daily traffic pattern profiling</description>
<location>project</location>
</skill>

<skill>
<name>implementing-next-generation-firewall-with-palo-alto</name>
<description>Configure and deploy Palo Alto Networks next-generation firewalls with App-ID, User-ID, zone-based policies, SSL decryption, and threat prevention profiles for enterprise network security.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-opa-gatekeeper-for-policy-enforcement</name>
<description>Enforce Kubernetes admission policies using OPA Gatekeeper with ConstraintTemplates, Rego rules, and the Gatekeeper policy library.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-ot-incident-response-playbook</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-ot-network-traffic-analysis-with-nozomi</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-pam-for-database-access</name>
<description>Deploy privileged access management for database systems including Oracle, SQL Server, PostgreSQL, and MySQL. Covers session proxy configuration, credential vaulting, query auditing, dynamic credentia</description>
<location>project</location>
</skill>

<skill>
<name>implementing-passwordless-auth-with-microsoft-entra</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-passwordless-authentication-with-fido2</name>
<description>Deploy FIDO2/WebAuthn passwordless authentication using security keys and platform authenticators. Covers WebAuthn API integration, FIDO2 server configuration, passkey enrollment, biometric authentica</description>
<location>project</location>
</skill>

<skill>
<name>implementing-patch-management-for-ot-systems</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-patch-management-workflow</name>
<description>Patch management is the systematic process of identifying, testing, deploying, and verifying software updates to remediate vulnerabilities across an organization's IT infrastructure. An effective patc</description>
<location>project</location>
</skill>

<skill>
<name>implementing-pci-dss-compliance-controls</name>
<description>PCI DSS 4.0.1 establishes 12 requirements across 6 control objectives for organizations that store, process, or transmit cardholder data. With PCI DSS 3.2.1 retiring April 2024 and 51 new requirements</description>
<location>project</location>
</skill>

<skill>
<name>implementing-pod-security-admission-controller</name>
<description>Implement Kubernetes Pod Security Admission to enforce baseline and restricted security profiles at namespace level using built-in admission controller.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-policy-as-code-with-open-policy-agent</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-privileged-access-management-with-cyberark</name>
<description>Deploy CyberArk Privileged Access Management to discover, vault, rotate, and monitor privileged credentials across enterprise infrastructure. This skill covers vault architecture, session isolation, c</description>
<location>project</location>
</skill>

<skill>
<name>implementing-privileged-access-workstation</name>
<description>Design and implement Privileged Access Workstations (PAWs) with device hardening, just-in-time access, and integration with CyberArk or BeyondTrust for secure administrative operations.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-privileged-session-monitoring</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-proofpoint-email-security-gateway</name>
<description>Deploy and configure Proofpoint Email Protection as a secure email gateway to detect and block phishing, malware, BEC, and spam before messages reach user inboxes.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-purdue-model-network-segmentation</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-ransomware-backup-strategy</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-ransomware-kill-switch-detection</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-rapid7-insightvm-for-scanning</name>
<description>Deploy and configure Rapid7 InsightVM Security Console and Scan Engines for authenticated and unauthenticated vulnerability scanning across enterprise environments.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-rbac-hardening-for-kubernetes</name>
<description>Harden Kubernetes Role-Based Access Control by implementing least-privilege policies, auditing role bindings, eliminating cluster-admin sprawl, and integrating external identity providers.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-rsa-key-pair-management</name>
<description>RSA (Rivest-Shamir-Adleman) is the most widely deployed asymmetric cryptographic algorithm, used for digital signatures, key exchange, and encryption. This skill covers generating, storing, rotating,</description>
<location>project</location>
</skill>

<skill>
<name>implementing-runtime-application-self-protection</name>
<description>Deploy Runtime Application Self-Protection (RASP) agents to detect and block attacks from within application runtime, covering OpenRASP integration, attack pattern detection, and security policy configuration for Java and Python web applications.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-runtime-security-with-tetragon</name>
<description>Implement eBPF-based runtime security observability and enforcement in Kubernetes clusters using Cilium Tetragon for kernel-level threat detection and policy enforcement.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-saml-sso-with-okta</name>
<description>Implement SAML 2.0 Single Sign-On (SSO) using Okta as the Identity Provider (IdP). This skill covers end-to-end configuration of SAML authentication flows, attribute mapping, certificate management, a</description>
<location>project</location>
</skill>

<skill>
<name>implementing-scim-provisioning-with-okta</name>
<description>Implement automated user provisioning and deprovisioning using SCIM 2.0 protocol with Okta as the identity provider.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-secret-scanning-with-gitleaks</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-secrets-management-with-vault</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-secrets-scanning-in-ci-cd</name>
<description>Integrate gitleaks and trufflehog into CI/CD pipelines to detect leaked secrets before deployment</description>
<location>project</location>
</skill>

<skill>
<name>implementing-security-chaos-engineering</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-security-information-sharing-with-stix2</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-security-monitoring-with-datadog</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-semgrep-for-custom-sast-rules</name>
<description>Write custom Semgrep SAST rules in YAML to detect application-specific vulnerabilities, enforce coding standards, and integrate into CI/CD pipelines.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-siem-correlation-rules-for-apt</name>
<description>>-</description>
<location>project</location>
</skill>

<skill>
<name>implementing-siem-use-case-tuning</name>
<description>Tune SIEM detection rules to reduce false positives by analyzing alert volumes, creating whitelists, adjusting thresholds, and measuring detection efficacy metrics in Splunk and Elastic</description>
<location>project</location>
</skill>

<skill>
<name>implementing-siem-use-cases-for-detection</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-sigstore-for-software-signing</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-soar-automation-with-phantom</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-soar-playbook-for-phishing</name>
<description>Automate phishing incident response using Splunk SOAR REST API to create containers, add artifacts, and trigger playbooks</description>
<location>project</location>
</skill>

<skill>
<name>implementing-soar-playbook-with-palo-alto-xsoar</name>
<description>Implement automated incident response playbooks in Cortex XSOAR to orchestrate security workflows across SOC tools and reduce manual response time.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-stix-taxii-feed-integration</name>
<description>STIX (Structured Threat Information eXpression) and TAXII (Trusted Automated eXchange of Intelligence Information) are OASIS open standards for representing and transporting cyber threat intelligence.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-supply-chain-security-with-in-toto</name>
<description>Implement software supply chain integrity verification for container builds using the in-toto framework to create cryptographically signed attestations across CI/CD pipeline steps.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-syslog-centralization-with-rsyslog</name>
<description>>-</description>
<location>project</location>
</skill>

<skill>
<name>implementing-taxii-server-with-opentaxii</name>
<description>Deploy and configure an OpenTAXII server to share and consume STIX-formatted cyber threat intelligence using the TAXII 2.1 protocol for automated indicator exchange between organizations.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-threat-intelligence-lifecycle-management</name>
<description>Implement a structured threat intelligence lifecycle encompassing planning, collection, processing, analysis, dissemination, and feedback stages to produce actionable intelligence for organizational decision-making.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-threat-modeling-with-mitre-attack</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-ticketing-system-for-incidents</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-usb-device-control-policy</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-velociraptor-for-ir-collection</name>
<description>Deploy and configure Velociraptor for scalable endpoint forensic artifact collection during incident response using VQL queries, hunts, and pre-built artifact packs across Windows, Linux, and macOS environments.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-vulnerability-management-with-greenbone</name>
<description>Deploy and operate Greenbone/OpenVAS vulnerability management using the python-gvm library to create scan targets, execute vulnerability scans, and parse scan reports via GMP protocol.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-vulnerability-remediation-sla</name>
<description>Vulnerability remediation SLAs define mandatory timeframes for patching or mitigating identified vulnerabilities based on severity, asset criticality, and exploit availability. Effective SLA programs</description>
<location>project</location>
</skill>

<skill>
<name>implementing-vulnerability-sla-breach-alerting</name>
<description>Build automated alerting for vulnerability remediation SLA breaches with severity-based timelines, escalation workflows, and compliance reporting dashboards.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-web-application-logging-with-modsecurity</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-zero-knowledge-proof-for-authentication</name>
<description>Zero-Knowledge Proofs (ZKPs) allow a prover to demonstrate knowledge of a secret (such as a password or private key) without revealing the secret itself. This skill implements the Schnorr identificati</description>
<location>project</location>
</skill>

<skill>
<name>implementing-zero-standing-privilege-with-cyberark</name>
<description>Deploy CyberArk Secure Cloud Access to eliminate standing privileges in hybrid and multi-cloud environments using just-in-time access with time, entitlement, and approval controls.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-zero-trust-dns-with-nextdns</name>
<description>Implement NextDNS as a zero trust DNS filtering layer with encrypted resolution, threat intelligence blocking, privacy protection, and organizational policy enforcement across all endpoints.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-zero-trust-for-saas-applications</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-zero-trust-in-cloud</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-zero-trust-network-access</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>implementing-zero-trust-network-access-with-zscaler</name>
<description>Implement Zero Trust Network Access using Zscaler Private Access (ZPA) to replace traditional VPN with identity-based, context-aware access to private applications through the Zscaler Zero Trust Exchange.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-zero-trust-with-beyondcorp</name>
<description>Deploy Google BeyondCorp Enterprise zero trust access controls using Identity-Aware Proxy (IAP), context-aware access policies, device trust validation, and Access Context Manager to enforce identity and posture-based access to GCP resources and internal applications.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-zero-trust-with-hashicorp-boundary</name>
<description>Implement HashiCorp Boundary for identity-aware zero trust infrastructure access management with dynamic credential brokering, session recording, and Vault integration.</description>
<location>project</location>
</skill>

<skill>
<name>integrating-dast-with-owasp-zap-in-pipeline</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>integrating-sast-into-github-actions-pipeline</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>intercepting-mobile-traffic-with-burpsuite</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>investigating-insider-threat-indicators</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>investigating-phishing-email-incident</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>investigating-ransomware-attack-artifacts</name>
<description>Identify, collect, and analyze ransomware attack artifacts to determine the variant, initial access vector, encryption scope, and recovery options.</description>
<location>project</location>
</skill>

<skill>
<name>managing-cloud-identity-with-okta</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>managing-intelligence-lifecycle</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>mapping-mitre-attack-techniques</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>monitoring-darkweb-sources</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>monitoring-scada-modbus-traffic-anomalies</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-access-recertification-with-saviynt</name>
<description>Configure and execute access recertification campaigns in Saviynt Enterprise Identity Cloud to validate user entitlements, revoke excessive access, and maintain compliance with SOX, SOC2, and HIPAA.</description>
<location>project</location>
</skill>

<skill>
<name>performing-access-review-and-certification</name>
<description>Conduct systematic access reviews and certifications to ensure users have appropriate access rights aligned with their roles. This skill covers review campaign design, reviewer selection, risk-based p</description>
<location>project</location>
</skill>

<skill>
<name>performing-active-directory-bloodhound-analysis</name>
<description>Use BloodHound and SharpHound to enumerate Active Directory relationships and identify attack paths from compromised users to Domain Admin.</description>
<location>project</location>
</skill>

<skill>
<name>performing-active-directory-compromise-investigation</name>
<description>Investigate Active Directory compromise by analyzing authentication logs, replication metadata, Group Policy changes, and Kerberos ticket anomalies to identify attacker persistence and lateral movement paths.</description>
<location>project</location>
</skill>

<skill>
<name>performing-active-directory-forest-trust-attack</name>
<description>Enumerate and audit Active Directory forest trust relationships using impacket for SID filtering analysis, trust key extraction, cross-forest SID history abuse detection, and inter-realm Kerberos ticket assessment.</description>
<location>project</location>
</skill>

<skill>
<name>performing-active-directory-penetration-test</name>
<description>Conduct a focused Active Directory penetration test to enumerate domain objects, discover attack paths with BloodHound, exploit Kerberos weaknesses, escalate privileges via ADCS/DCSync, and demonstrate domain compromise.</description>
<location>project</location>
</skill>

<skill>
<name>performing-active-directory-vulnerability-assessment</name>
<description>Assess Active Directory security posture using PingCastle, BloodHound, and Purple Knight to identify misconfigurations, privilege escalation paths, and attack vectors.</description>
<location>project</location>
</skill>

<skill>
<name>performing-adversary-in-the-middle-phishing-detection</name>
<description>Detect and respond to Adversary-in-the-Middle (AiTM) phishing attacks that use reverse proxy kits like EvilProxy, Evilginx, and Tycoon 2FA to bypass MFA and steal session tokens.</description>
<location>project</location>
</skill>

<skill>
<name>performing-agentless-vulnerability-scanning</name>
<description>Configure and execute agentless vulnerability scanning using network protocols, cloud snapshot analysis, and API-based discovery to assess systems without installing endpoint agents.</description>
<location>project</location>
</skill>

<skill>
<name>performing-ai-driven-osint-correlation</name>
<description>>-</description>
<location>project</location>
</skill>

<skill>
<name>performing-alert-triage-with-elastic-siem</name>
<description>Perform systematic alert triage in Elastic Security SIEM to rapidly classify, prioritize, and investigate security alerts for SOC operations.</description>
<location>project</location>
</skill>

<skill>
<name>performing-android-app-static-analysis-with-mobsf</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-api-fuzzing-with-restler</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-api-inventory-and-discovery</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-api-rate-limiting-bypass</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-api-security-testing-with-postman</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-arp-spoofing-attack-simulation</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-asset-criticality-scoring-for-vulns</name>
<description>Develop and apply a multi-factor asset criticality scoring model to weight vulnerability prioritization based on business impact, data sensitivity, and operational importance.</description>
<location>project</location>
</skill>

<skill>
<name>performing-authenticated-scan-with-openvas</name>
<description>Configure and execute authenticated vulnerability scans using OpenVAS/Greenbone Vulnerability Management with SSH and SMB credentials for comprehensive host-level assessment.</description>
<location>project</location>
</skill>

<skill>
<name>performing-authenticated-vulnerability-scan</name>
<description>Authenticated (credentialed) vulnerability scanning uses valid system credentials to log into target hosts and perform deep inspection of installed software, patches, configurations, and security sett</description>
<location>project</location>
</skill>

<skill>
<name>performing-automated-malware-analysis-with-cape</name>
<description>Deploy and operate CAPEv2 sandbox for automated malware analysis with behavioral monitoring, payload extraction, configuration parsing, and anti-evasion capabilities.</description>
<location>project</location>
</skill>

<skill>
<name>performing-aws-account-enumeration-with-scout-suite</name>
<description>Perform comprehensive security posture assessment of AWS accounts using ScoutSuite to enumerate resources, identify misconfigurations, and generate actionable security reports.</description>
<location>project</location>
</skill>

<skill>
<name>performing-aws-privilege-escalation-assessment</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-bandwidth-throttling-attack-simulation</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-binary-exploitation-analysis</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-blind-ssrf-exploitation</name>
<description>Detect and exploit blind Server-Side Request Forgery vulnerabilities using out-of-band techniques, DNS interactions, and timing analysis to access internal services and cloud metadata endpoints.</description>
<location>project</location>
</skill>

<skill>
<name>performing-bluetooth-security-assessment</name>
<description>Assess Bluetooth Low Energy device security by scanning, enumerating GATT services, and detecting vulnerabilities</description>
<location>project</location>
</skill>

<skill>
<name>performing-brand-monitoring-for-impersonation</name>
<description>Monitor for brand impersonation attacks across domains, social media, mobile apps, and dark web channels to detect phishing campaigns, fake sites, and unauthorized brand usage targeting your organization.</description>
<location>project</location>
</skill>

<skill>
<name>performing-clickjacking-attack-test</name>
<description>Testing web applications for clickjacking vulnerabilities by assessing frame embedding controls and crafting proof-of-concept overlay attacks during authorized security assessments.</description>
<location>project</location>
</skill>

<skill>
<name>performing-cloud-asset-inventory-with-cartography</name>
<description>Perform comprehensive cloud asset inventory and relationship mapping using Cartography to build a Neo4j security graph of infrastructure assets, IAM permissions, and attack paths across AWS, GCP, and Azure.</description>
<location>project</location>
</skill>

<skill>
<name>performing-cloud-forensics-investigation</name>
<description>Conduct forensic investigations in cloud environments by collecting and analyzing logs, snapshots, and metadata from AWS, Azure, and GCP services.</description>
<location>project</location>
</skill>

<skill>
<name>performing-cloud-forensics-with-aws-cloudtrail</name>
<description>Perform forensic investigation of AWS environments using CloudTrail logs to reconstruct attacker activity, identify compromised credentials, and analyze API call patterns.</description>
<location>project</location>
</skill>

<skill>
<name>performing-cloud-incident-containment-procedures</name>
<description>Execute cloud-native incident containment across AWS, Azure, and GCP by isolating compromised resources, revoking credentials, preserving forensic evidence, and applying security group restrictions to prevent lateral movement.</description>
<location>project</location>
</skill>

<skill>
<name>performing-cloud-log-forensics-with-athena</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-cloud-native-forensics-with-falco</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-cloud-penetration-testing-with-pacu</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-cloud-storage-forensic-acquisition</name>
<description>Perform forensic acquisition and analysis of cloud storage services including Google Drive, OneDrive, Dropbox, and Box by collecting both API-based remote data and local sync client artifacts from endpoint devices.</description>
<location>project</location>
</skill>

<skill>
<name>performing-container-escape-detection</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-container-image-hardening</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-container-security-scanning-with-trivy</name>
<description>Scan container images, filesystems, and Kubernetes manifests for vulnerabilities, misconfigurations, exposed secrets, and license compliance issues using Aqua Security Trivy with SBOM generation and CI/CD integration.</description>
<location>project</location>
</skill>

<skill>
<name>performing-content-security-policy-bypass</name>
<description>Analyze and bypass Content Security Policy implementations to achieve cross-site scripting by exploiting misconfigurations, JSONP endpoints, unsafe directives, and policy injection techniques.</description>
<location>project</location>
</skill>

<skill>
<name>performing-credential-access-with-lazagne</name>
<description>Extract stored credentials from compromised endpoints using the LaZagne post-exploitation tool to recover passwords from browsers, databases, system vaults, and applications during authorized red team operations.</description>
<location>project</location>
</skill>

<skill>
<name>performing-cryptographic-audit-of-application</name>
<description>A cryptographic audit systematically reviews an application's use of cryptographic primitives, protocols, and key management to identify vulnerabilities such as weak algorithms, insecure modes, hardco</description>
<location>project</location>
</skill>

<skill>
<name>performing-csrf-attack-simulation</name>
<description>Testing web applications for Cross-Site Request Forgery vulnerabilities by crafting forged requests that exploit authenticated user sessions during authorized security assessments.</description>
<location>project</location>
</skill>

<skill>
<name>performing-cve-prioritization-with-kev-catalog</name>
<description>Leverage the CISA Known Exploited Vulnerabilities catalog alongside EPSS and CVSS to prioritize CVE remediation based on real-world exploitation evidence.</description>
<location>project</location>
</skill>

<skill>
<name>performing-dark-web-monitoring-for-threats</name>
<description>Dark web monitoring involves systematically scanning Tor hidden services, underground forums, paste sites, and dark web marketplaces to identify threats targeting an organization, including leaked cre</description>
<location>project</location>
</skill>

<skill>
<name>performing-deception-technology-deployment</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-directory-traversal-testing</name>
<description>Testing web applications for path traversal vulnerabilities that allow reading or writing arbitrary files on the server by manipulating file path parameters.</description>
<location>project</location>
</skill>

<skill>
<name>performing-disk-forensics-investigation</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-dmarc-policy-enforcement-rollout</name>
<description>Execute a phased DMARC rollout from p=none monitoring through p=quarantine to p=reject enforcement, ensuring all legitimate email sources are authenticated before blocking unauthorized senders.</description>
<location>project</location>
</skill>

<skill>
<name>performing-dns-enumeration-and-zone-transfer</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-dns-tunneling-detection</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-docker-bench-security-assessment</name>
<description>Docker Bench for Security is an open-source script that checks dozens of common best practices around deploying Docker containers in production. Based on the CIS Docker Benchmark, it audits host confi</description>
<location>project</location>
</skill>

<skill>
<name>performing-dynamic-analysis-of-android-app</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-dynamic-analysis-with-any-run</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-endpoint-forensics-investigation</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-endpoint-vulnerability-remediation</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-entitlement-review-with-sailpoint-iiq</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-external-network-penetration-test</name>
<description>Conduct a comprehensive external network penetration test to identify vulnerabilities in internet-facing infrastructure using PTES methodology, reconnaissance, scanning, exploitation, and reporting.</description>
<location>project</location>
</skill>

<skill>
<name>performing-false-positive-reduction-in-siem</name>
<description>Perform systematic SIEM false positive reduction through rule tuning, threshold adjustment, correlation refinement, and threat intelligence enrichment to combat alert fatigue.</description>
<location>project</location>
</skill>

<skill>
<name>performing-file-carving-with-foremost</name>
<description>Recover files from disk images and unallocated space using Foremost's header-footer signature carving to extract evidence regardless of file system state.</description>
<location>project</location>
</skill>

<skill>
<name>performing-firmware-extraction-with-binwalk</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-firmware-malware-analysis</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-fuzzing-with-aflplusplus</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-gcp-penetration-testing-with-gcpbucketbrute</name>
<description>Perform GCP security testing using GCPBucketBrute for storage bucket enumeration, gcloud IAM privilege escalation path analysis, and service account permission auditing</description>
<location>project</location>
</skill>

<skill>
<name>performing-gcp-security-assessment-with-forseti</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-graphql-depth-limit-attack</name>
<description>Execute and test GraphQL depth limit attacks using deeply nested recursive queries to identify denial-of-service vulnerabilities in GraphQL APIs.</description>
<location>project</location>
</skill>

<skill>
<name>performing-graphql-introspection-attack</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-graphql-security-assessment</name>
<description>Assessing GraphQL API endpoints for introspection leaks, injection attacks, authorization flaws, and denial-of-service vulnerabilities during authorized security tests.</description>
<location>project</location>
</skill>

<skill>
<name>performing-hardware-security-module-integration</name>
<description>Integrate Hardware Security Modules (HSMs) using PKCS#11 interface for cryptographic key management, signing operations, and secure key storage with python-pkcs11, AWS CloudHSM, and YubiHSM2.</description>
<location>project</location>
</skill>

<skill>
<name>performing-hash-cracking-with-hashcat</name>
<description>Hash cracking is an essential skill for penetration testers and security auditors to evaluate password strength. Hashcat is the world's fastest password recovery tool, supporting over 300 hash types w</description>
<location>project</location>
</skill>

<skill>
<name>performing-http-parameter-pollution-attack</name>
<description>Execute HTTP Parameter Pollution attacks to bypass input validation, WAF rules, and security controls by injecting duplicate parameters that are processed differently by front-end and back-end systems.</description>
<location>project</location>
</skill>

<skill>
<name>performing-ics-asset-discovery-with-claroty</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-indicator-lifecycle-management</name>
<description>Indicator lifecycle management tracks IOCs from initial discovery through validation, enrichment, deployment, monitoring, and eventual retirement. This skill covers implementing systematic processes f</description>
<location>project</location>
</skill>

<skill>
<name>performing-initial-access-with-evilginx3</name>
<description>Perform authorized initial access using EvilGinx3 adversary-in-the-middle phishing framework to capture session tokens and bypass multi-factor authentication during red team engagements.</description>
<location>project</location>
</skill>

<skill>
<name>performing-insider-threat-investigation</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-ioc-enrichment-automation</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-ios-app-security-assessment</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-iot-security-assessment</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-ip-reputation-analysis-with-shodan</name>
<description>Analyze IP address reputation using the Shodan API to identify open ports, running services, known vulnerabilities, and hosting context for threat intelligence enrichment and incident triage.</description>
<location>project</location>
</skill>

<skill>
<name>performing-jwt-none-algorithm-attack</name>
<description>Execute and test the JWT none algorithm attack to bypass signature verification by manipulating the alg header field in JSON Web Tokens.</description>
<location>project</location>
</skill>

<skill>
<name>performing-kerberoasting-attack</name>
<description>Kerberoasting is a post-exploitation technique that targets service accounts in Active Directory by requesting Kerberos TGS (Ticket Granting Service) tickets for accounts with Service Principal Names</description>
<location>project</location>
</skill>

<skill>
<name>performing-kubernetes-cis-benchmark-with-kube-bench</name>
<description>Audit Kubernetes cluster security posture against CIS benchmarks using kube-bench with automated checks for control plane, worker nodes, and RBAC.</description>
<location>project</location>
</skill>

<skill>
<name>performing-kubernetes-etcd-security-assessment</name>
<description>Assess the security posture of Kubernetes etcd clusters by evaluating encryption at rest, TLS configuration, access controls, backup encryption, and network isolation.</description>
<location>project</location>
</skill>

<skill>
<name>performing-kubernetes-penetration-testing</name>
<description>Kubernetes penetration testing systematically evaluates cluster security by simulating attacker techniques against the API server, kubelet, etcd, pods, RBAC, network policies, and secrets. Using tools</description>
<location>project</location>
</skill>

<skill>
<name>performing-lateral-movement-detection</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-lateral-movement-with-wmiexec</name>
<description>Perform lateral movement across Windows networks using WMI-based remote execution techniques including Impacket wmiexec.py, CrackMapExec, and native WMI commands for stealthy post-exploitation during red team engagements.</description>
<location>project</location>
</skill>

<skill>
<name>performing-linux-log-forensics-investigation</name>
<description>Perform forensic investigation of Linux system logs including syslog, auth.log, systemd journal, kern.log, and application logs to reconstruct user activity, detect unauthorized access, and establish event timelines on compromised Linux systems.</description>
<location>project</location>
</skill>

<skill>
<name>performing-log-analysis-for-forensic-investigation</name>
<description>Collect, parse, and correlate system, application, and security logs to reconstruct events and establish timelines during forensic investigations.</description>
<location>project</location>
</skill>

<skill>
<name>performing-log-source-onboarding-in-siem</name>
<description>Perform structured log source onboarding into SIEM platforms by configuring collectors, parsers, normalization, and validation for complete security visibility.</description>
<location>project</location>
</skill>

<skill>
<name>performing-malware-hash-enrichment-with-virustotal</name>
<description>Enrich malware file hashes using the VirusTotal API to retrieve detection rates, behavioral analysis, YARA matches, and contextual threat intelligence for incident triage and IOC validation.</description>
<location>project</location>
</skill>

<skill>
<name>performing-malware-ioc-extraction</name>
<description>Malware IOC extraction is the process of analyzing malicious software to identify actionable indicators of compromise including file hashes, network indicators (C2 domains, IP addresses, URLs), regist</description>
<location>project</location>
</skill>

<skill>
<name>performing-malware-persistence-investigation</name>
<description>Systematically investigate all persistence mechanisms on Windows and Linux systems to identify how malware survives reboots and maintains access.</description>
<location>project</location>
</skill>

<skill>
<name>performing-malware-triage-with-yara</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-memory-forensics-with-volatility3</name>
<description>Analyze volatile memory dumps using Volatility 3 to extract running processes, network connections, loaded modules, and evidence of malicious activity.</description>
<location>project</location>
</skill>

<skill>
<name>performing-memory-forensics-with-volatility3-plugins</name>
<description>Analyze memory dumps using Volatility3 plugins to detect injected code, rootkits, credential theft, and malware artifacts in Windows, Linux, and macOS memory images.</description>
<location>project</location>
</skill>

<skill>
<name>performing-mobile-app-certificate-pinning-bypass</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-mobile-device-forensics-with-cellebrite</name>
<description>Acquire and analyze mobile device data using Cellebrite UFED and open-source tools to extract communications, location data, and application artifacts.</description>
<location>project</location>
</skill>

<skill>
<name>performing-network-forensics-with-wireshark</name>
<description>Capture and analyze network traffic using Wireshark and tshark to reconstruct network events, extract artifacts, and identify malicious communications.</description>
<location>project</location>
</skill>

<skill>
<name>performing-network-packet-capture-analysis</name>
<description>Perform forensic analysis of network packet captures (PCAP/PCAPNG) using Wireshark, tshark, and tcpdump to reconstruct network communications, extract transferred files, identify malicious traffic, and establish evidence of data exfiltration or command-and-control activity.</description>
<location>project</location>
</skill>

<skill>
<name>performing-network-traffic-analysis-with-tshark</name>
<description>Automate network traffic analysis using tshark and pyshark for protocol statistics, suspicious flow detection, DNS anomaly identification, and IOC extraction from PCAP files</description>
<location>project</location>
</skill>

<skill>
<name>performing-network-traffic-analysis-with-zeek</name>
<description>Deploy Zeek network security monitor to capture, parse, and analyze network traffic metadata for threat detection, anomaly identification, and forensic investigation.</description>
<location>project</location>
</skill>

<skill>
<name>performing-nist-csf-maturity-assessment</name>
<description>>-</description>
<location>project</location>
</skill>

<skill>
<name>performing-oauth-scope-minimization-review</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-oil-gas-cybersecurity-assessment</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-open-source-intelligence-gathering</name>
<description>Open Source Intelligence (OSINT) gathering is the first active phase of a red team engagement, where operators collect publicly available information about the target organization to identify attack s</description>
<location>project</location>
</skill>

<skill>
<name>performing-osint-with-spiderfoot</name>
<description>Automate OSINT collection using SpiderFoot REST API and CLI for target profiling, module-based reconnaissance, and structured result analysis across 200+ data sources</description>
<location>project</location>
</skill>

<skill>
<name>performing-ot-network-security-assessment</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-ot-vulnerability-assessment-with-claroty</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-ot-vulnerability-scanning-safely</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-packet-injection-attack</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-paste-site-monitoring-for-credentials</name>
<description>Monitor paste sites like Pastebin and GitHub Gists for leaked credentials, API keys, and sensitive data dumps using automated scraping and keyword matching to detect breaches early.</description>
<location>project</location>
</skill>

<skill>
<name>performing-phishing-simulation-with-gophish</name>
<description>GoPhish is an open-source phishing simulation framework used by security teams to conduct authorized phishing awareness campaigns. It provides campaign management, email template creation, landing pag</description>
<location>project</location>
</skill>

<skill>
<name>performing-physical-intrusion-assessment</name>
<description>Conduct authorized physical penetration testing using tailgating, badge cloning, lock bypassing, and rogue device deployment to evaluate facility security controls.</description>
<location>project</location>
</skill>

<skill>
<name>performing-plc-firmware-security-analysis</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-post-quantum-cryptography-migration</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-power-grid-cybersecurity-assessment</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-privacy-impact-assessment</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-privilege-escalation-assessment</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-privilege-escalation-on-linux</name>
<description>Linux privilege escalation involves elevating from a low-privilege user account to root access on a compromised system. Red teams exploit misconfigurations, vulnerable services, kernel exploits, and w</description>
<location>project</location>
</skill>

<skill>
<name>performing-privileged-account-access-review</name>
<description>Conduct systematic reviews of privileged accounts to validate access rights, identify excessive permissions, and enforce least privilege across PAM infrastructure.</description>
<location>project</location>
</skill>

<skill>
<name>performing-privileged-account-discovery</name>
<description>Discover and inventory all privileged accounts across enterprise infrastructure including domain admins, local admins, service accounts, database admins, cloud IAM roles, and application admin account</description>
<location>project</location>
</skill>

<skill>
<name>performing-purple-team-atomic-testing</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-purple-team-exercise</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-ransomware-response</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-ransomware-tabletop-exercise</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-red-team-phishing-with-gophish</name>
<description>>-</description>
<location>project</location>
</skill>

<skill>
<name>performing-red-team-with-covenant</name>
<description>Conduct red team operations using the Covenant C2 framework for authorized adversary simulation, including listener setup, grunt deployment, task execution, and lateral movement tracking.</description>
<location>project</location>
</skill>

<skill>
<name>performing-s7comm-protocol-security-analysis</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-sca-dependency-scanning-with-snyk</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-scada-hmi-security-assessment</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-second-order-sql-injection</name>
<description>Detect and exploit second-order SQL injection vulnerabilities where malicious input is stored in a database and later executed in an unsafe SQL query during a different application operation.</description>
<location>project</location>
</skill>

<skill>
<name>performing-security-headers-audit</name>
<description>Auditing HTTP security headers including CSP, HSTS, X-Frame-Options, and cookie attributes to identify missing or misconfigured browser-level protections.</description>
<location>project</location>
</skill>

<skill>
<name>performing-serverless-function-security-review</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-service-account-audit</name>
<description>Audit service accounts across enterprise infrastructure to identify orphaned, over-privileged, and non-compliant accounts. This skill covers discovery of service accounts in Active Directory, cloud pl</description>
<location>project</location>
</skill>

<skill>
<name>performing-service-account-credential-rotation</name>
<description>Automate credential rotation for service accounts across Active Directory, cloud platforms, and application databases to eliminate stale secrets and reduce compromise risk.</description>
<location>project</location>
</skill>

<skill>
<name>performing-soap-web-service-security-testing</name>
<description>Perform security testing of SOAP web services by analyzing WSDL definitions and testing for XML injection, XXE, WS-Security bypass, and SOAPAction spoofing.</description>
<location>project</location>
</skill>

<skill>
<name>performing-soc-tabletop-exercise</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-soc2-type2-audit-preparation</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-sqlite-database-forensics</name>
<description>Perform forensic analysis of SQLite databases to recover deleted records from freelists and WAL files, decode encoded timestamps, and extract evidence from browser history, messaging apps, and mobile device databases.</description>
<location>project</location>
</skill>

<skill>
<name>performing-ssl-certificate-lifecycle-management</name>
<description>SSL/TLS certificate lifecycle management encompasses the full process of requesting, issuing, deploying, monitoring, renewing, and revoking X.509 certificates. Poor certificate management is a leading</description>
<location>project</location>
</skill>

<skill>
<name>performing-ssl-stripping-attack</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-ssl-tls-inspection-configuration</name>
<description>Configure SSL/TLS inspection on network security devices to decrypt, inspect, and re-encrypt HTTPS traffic for threat detection while managing certificates, exemptions, and privacy compliance.</description>
<location>project</location>
</skill>

<skill>
<name>performing-ssl-tls-security-assessment</name>
<description>Assess SSL/TLS server configurations using the sslyze Python library to evaluate cipher suites, certificate chains, protocol versions, HSTS headers, and known vulnerabilities like Heartbleed and ROBOT.</description>
<location>project</location>
</skill>

<skill>
<name>performing-ssrf-vulnerability-exploitation</name>
<description>>-</description>
<location>project</location>
</skill>

<skill>
<name>performing-static-malware-analysis-with-pe-studio</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-steganography-detection</name>
<description>Detect and extract hidden data embedded in images, audio, and other media files using steganalysis tools to uncover covert communication channels.</description>
<location>project</location>
</skill>

<skill>
<name>performing-subdomain-enumeration-with-subfinder</name>
<description>Enumerate subdomains of target domains using ProjectDiscovery's Subfinder passive reconnaissance tool to map the attack surface during security assessments.</description>
<location>project</location>
</skill>

<skill>
<name>performing-supply-chain-attack-simulation</name>
<description>Simulate and detect software supply chain attacks including typosquatting detection via Levenshtein distance, dependency confusion testing against private registries, package hash verification with pip, and known vulnerability scanning with pip-audit.</description>
<location>project</location>
</skill>

<skill>
<name>performing-thick-client-application-penetration-test</name>
<description>Conduct a thick client application penetration test to identify insecure local storage, hardcoded credentials, DLL hijacking, memory manipulation, and insecure API communication in desktop applications using dnSpy, Procmon, and Burp Suite.</description>
<location>project</location>
</skill>

<skill>
<name>performing-threat-emulation-with-atomic-red-team</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-threat-hunting-with-elastic-siem</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-threat-hunting-with-yara-rules</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-threat-intelligence-sharing-with-misp</name>
<description>Use PyMISP to create, enrich, and share threat intelligence events on a MISP platform, including IOC management, feed integration, STIX export, and community sharing workflows.</description>
<location>project</location>
</skill>

<skill>
<name>performing-threat-landscape-assessment-for-sector</name>
<description>Conduct a sector-specific threat landscape assessment by analyzing threat actor targeting patterns, common attack vectors, and industry-specific vulnerabilities to inform organizational risk management.</description>
<location>project</location>
</skill>

<skill>
<name>performing-threat-modeling-with-owasp-threat-dragon</name>
<description>Use OWASP Threat Dragon to create data flow diagrams, identify threats using STRIDE and LINDDUN methodologies, and generate threat model reports for secure design review.</description>
<location>project</location>
</skill>

<skill>
<name>performing-timeline-reconstruction-with-plaso</name>
<description>Build comprehensive forensic super-timelines using Plaso (log2timeline) to correlate events across file systems, logs, and artifacts into a unified chronological view.</description>
<location>project</location>
</skill>

<skill>
<name>performing-user-behavior-analytics</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-vlan-hopping-attack</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-vulnerability-scanning-with-nessus</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-web-application-firewall-bypass</name>
<description>Bypass Web Application Firewall protections using encoding techniques, HTTP method manipulation, parameter pollution, and payload obfuscation to deliver SQL injection, XSS, and other attack payloads past WAF detection rules.</description>
<location>project</location>
</skill>

<skill>
<name>performing-web-application-penetration-test</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-web-application-scanning-with-nikto</name>
<description>Nikto is an open-source web server and web application scanner that tests against over 7,000 potentially dangerous files/programs, checks for outdated versions of over 1,250 servers, and identifies ve</description>
<location>project</location>
</skill>

<skill>
<name>performing-web-application-vulnerability-triage</name>
<description>Triage web application vulnerability findings from DAST/SAST scanners using OWASP risk rating methodology to separate true positives from false positives and prioritize remediation.</description>
<location>project</location>
</skill>

<skill>
<name>performing-web-cache-deception-attack</name>
<description>Execute web cache deception attacks by exploiting path normalization discrepancies between CDN caching layers and origin servers to cache and retrieve sensitive authenticated content.</description>
<location>project</location>
</skill>

<skill>
<name>performing-web-cache-poisoning-attack</name>
<description>Exploiting web cache mechanisms to serve malicious content to other users by poisoning cached responses through unkeyed headers and parameters during authorized security tests.</description>
<location>project</location>
</skill>

<skill>
<name>performing-wifi-password-cracking-with-aircrack</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>performing-windows-artifact-analysis-with-eric-zimmerman-tools</name>
<description>Perform comprehensive Windows forensic artifact analysis using Eric Zimmerman's open-source EZ Tools suite including KAPE, MFTECmd, PECmd, LECmd, JLECmd, and Timeline Explorer for parsing registry hives, prefetch files, event logs, and file system metadata.</description>
<location>project</location>
</skill>

<skill>
<name>performing-wireless-network-penetration-test</name>
<description>Execute a wireless network penetration test to assess WiFi security by capturing handshakes, cracking WPA2/WPA3 keys, detecting rogue access points, and testing wireless segmentation using Aircrack-ng and related tools.</description>
<location>project</location>
</skill>

<skill>
<name>performing-wireless-security-assessment-with-kismet</name>
<description>Conduct wireless network security assessments using Kismet to detect rogue access points, hidden SSIDs, weak encryption, and unauthorized clients through passive RF monitoring.</description>
<location>project</location>
</skill>

<skill>
<name>performing-yara-rule-development-for-detection</name>
<description>Develop precise YARA rules for malware detection by identifying unique byte patterns, strings, and behavioral indicators in executable files while minimizing false positives.</description>
<location>project</location>
</skill>

<skill>
<name>prioritizing-vulnerabilities-with-cvss-scoring</name>
<description>The Common Vulnerability Scoring System (CVSS) is the industry standard framework maintained by FIRST (Forum of Incident Response and Security Teams) for assessing vulnerability severity. CVSS v4.0 (r</description>
<location>project</location>
</skill>

<skill>
<name>processing-stix-taxii-feeds</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>profiling-threat-actor-groups</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>recovering-deleted-files-with-photorec</name>
<description>Recover deleted files from disk images and storage media using PhotoRec's file signature-based carving engine regardless of file system damage.</description>
<location>project</location>
</skill>

<skill>
<name>recovering-from-ransomware-attack</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>remediating-s3-bucket-misconfiguration</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>reverse-engineering-android-malware-with-jadx</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>reverse-engineering-dotnet-malware-with-dnspy</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>reverse-engineering-ios-app-with-frida</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>reverse-engineering-malware-with-ghidra</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>reverse-engineering-ransomware-encryption-routine</name>
<description>Reverse engineer ransomware encryption routines to identify cryptographic algorithms, key generation flaws, and potential decryption opportunities using static and dynamic analysis.</description>
<location>project</location>
</skill>

<skill>
<name>reverse-engineering-rust-malware</name>
<description>Reverse engineer Rust-compiled malware using IDA Pro and Ghidra with techniques for handling non-null-terminated strings, crate dependency extraction, and Rust-specific control flow analysis.</description>
<location>project</location>
</skill>

<skill>
<name>scanning-container-images-with-grype</name>
<description>Scan container images for known vulnerabilities using Anchore Grype with SBOM-based matching and configurable severity thresholds.</description>
<location>project</location>
</skill>

<skill>
<name>scanning-containers-with-trivy-in-cicd</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>scanning-docker-images-with-trivy</name>
<description>Trivy is a comprehensive open-source vulnerability scanner by Aqua Security that detects vulnerabilities in OS packages, language-specific dependencies, misconfigurations, secrets, and license violati</description>
<location>project</location>
</skill>

<skill>
<name>scanning-infrastructure-with-nessus</name>
<description>Tenable Nessus is the industry-leading vulnerability scanner used to identify security weaknesses across network infrastructure including servers, workstations, network devices, and operating systems.</description>
<location>project</location>
</skill>

<skill>
<name>scanning-kubernetes-manifests-with-kubesec</name>
<description>Perform security risk analysis on Kubernetes resource manifests using Kubesec to identify misconfigurations, privilege escalation risks, and deviations from security best practices.</description>
<location>project</location>
</skill>

<skill>
<name>scanning-network-with-nmap-advanced</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>securing-api-gateway-with-aws-waf</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>securing-aws-iam-permissions</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>securing-aws-lambda-execution-roles</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>securing-azure-with-microsoft-defender</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>securing-container-registry-images</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>securing-container-registry-with-harbor</name>
<description>Harbor is an open-source container registry that provides security features including vulnerability scanning (integrated Trivy), image signing (Notary/Cosign), RBAC, content trust policies, replicatio</description>
<location>project</location>
</skill>

<skill>
<name>securing-github-actions-workflows</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>securing-helm-chart-deployments</name>
<description>Secure Helm chart deployments by validating chart integrity, scanning templates for misconfigurations, and enforcing security contexts in Kubernetes releases.</description>
<location>project</location>
</skill>

<skill>
<name>securing-historian-server-in-ot-environment</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>securing-kubernetes-on-cloud</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>securing-remote-access-to-ot-environment</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>securing-serverless-functions</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>testing-android-intents-for-vulnerabilities</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>testing-api-authentication-weaknesses</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>testing-api-for-broken-object-level-authorization</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>testing-api-for-mass-assignment-vulnerability</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>testing-api-security-with-owasp-top-10</name>
<description>Systematically assessing REST and GraphQL API endpoints against the OWASP API Security Top 10 risks using automated and manual testing techniques.</description>
<location>project</location>
</skill>

<skill>
<name>testing-cors-misconfiguration</name>
<description>Identifying and exploiting Cross-Origin Resource Sharing misconfigurations that allow unauthorized cross-domain data access and credential theft during security assessments.</description>
<location>project</location>
</skill>

<skill>
<name>testing-for-broken-access-control</name>
<description>Systematically testing web applications for broken access control vulnerabilities including privilege escalation, missing function-level checks, and insecure direct object references.</description>
<location>project</location>
</skill>

<skill>
<name>testing-for-business-logic-vulnerabilities</name>
<description>Identifying flaws in application business logic that allow price manipulation, workflow bypass, and privilege escalation beyond what technical vulnerability scanners can detect.</description>
<location>project</location>
</skill>

<skill>
<name>testing-for-email-header-injection</name>
<description>Test web application email functionality for SMTP header injection vulnerabilities that allow attackers to inject additional email headers, modify recipients, and abuse contact forms for spam relay.</description>
<location>project</location>
</skill>

<skill>
<name>testing-for-host-header-injection</name>
<description>Test web applications for HTTP Host header injection vulnerabilities to identify password reset poisoning, web cache poisoning, SSRF, and virtual host routing manipulation risks.</description>
<location>project</location>
</skill>

<skill>
<name>testing-for-json-web-token-vulnerabilities</name>
<description>Test JWT implementations for critical vulnerabilities including algorithm confusion, none algorithm bypass, kid parameter injection, and weak secret exploitation to achieve authentication bypass and privilege escalation.</description>
<location>project</location>
</skill>

<skill>
<name>testing-for-open-redirect-vulnerabilities</name>
<description>Identify and test open redirect vulnerabilities in web applications by analyzing URL redirection parameters, bypass techniques, and exploitation chains for phishing and token theft.</description>
<location>project</location>
</skill>

<skill>
<name>testing-for-sensitive-data-exposure</name>
<description>Identifying sensitive data exposure vulnerabilities including API key leakage, PII in responses, insecure storage, and unprotected data transmission during security assessments.</description>
<location>project</location>
</skill>

<skill>
<name>testing-for-xml-injection-vulnerabilities</name>
<description>Test web applications for XML injection vulnerabilities including XXE, XPath injection, and XML entity attacks to identify data exposure and server-side request forgery risks.</description>
<location>project</location>
</skill>

<skill>
<name>testing-for-xss-vulnerabilities</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>testing-for-xss-vulnerabilities-with-burpsuite</name>
<description>Identifying and validating cross-site scripting vulnerabilities using Burp Suite's scanner, intruder, and repeater tools during authorized security assessments.</description>
<location>project</location>
</skill>

<skill>
<name>testing-for-xxe-injection-vulnerabilities</name>
<description>Discovering and exploiting XML External Entity injection vulnerabilities to read server files, perform SSRF, and exfiltrate data during authorized penetration tests.</description>
<location>project</location>
</skill>

<skill>
<name>testing-jwt-token-security</name>
<description>Assessing JSON Web Token implementations for cryptographic weaknesses, algorithm confusion attacks, and authorization bypass vulnerabilities during security engagements.</description>
<location>project</location>
</skill>

<skill>
<name>testing-mobile-api-authentication</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>testing-oauth2-implementation-flaws</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>testing-ransomware-recovery-procedures</name>
<description>>-</description>
<location>project</location>
</skill>

<skill>
<name>testing-websocket-api-security</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>tracking-threat-actor-infrastructure</name>
<description>Threat actor infrastructure tracking involves monitoring and mapping adversary-controlled assets including command-and-control (C2) servers, phishing domains, exploit kit hosts, bulletproof hosting, a</description>
<location>project</location>
</skill>

<skill>
<name>triaging-security-alerts-in-splunk</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>triaging-security-incident</name>
<description>></description>
<location>project</location>
</skill>

<skill>
<name>triaging-security-incident-with-ir-playbook</name>
<description>Classify and prioritize security incidents using structured IR playbooks to determine severity, assign response teams, and initiate appropriate response procedures.</description>
<location>project</location>
</skill>

<skill>
<name>triaging-vulnerabilities-with-ssvc-framework</name>
<description>Triage and prioritize vulnerabilities using CISA's Stakeholder-Specific Vulnerability Categorization (SSVC) decision tree framework to produce actionable remediation priorities.</description>
<location>project</location>
</skill>

<skill>
<name>validating-backup-integrity-for-recovery</name>
<description>>-</description>
<location>project</location>
</skill>

</available_skills>
<!-- SKILLS_TABLE_END -->

</skills_system>
