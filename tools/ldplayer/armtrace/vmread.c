/*
 * vmread <pid> <indirizzo_hex> <lunghezza_hex>  > file
 *
 * Copia memoria di un altro processo con process_vm_readv (syscall 310 su x86_64),
 * scrivendola su stdout. Serve perche' LIAPP chiude il gioco appena qualcuno apre
 * /proc/<pid>/mem: process_vm_readv non apre file.
 *
 * Nel guest non c'e' un compilatore e sul PC c'e' solo MinGW: il programma non usa
 * libc ne' dati globali (niente stringhe, niente rilocazioni). MinGW lo compila
 * (convenzione di chiamata Microsoft: argomenti in rcx, rdx, r8, r9), build_vmread.py
 * prende il codice macchina e lo avvolge in un ELF statico Linux x86_64. _start e'
 * l'unico punto d'ingresso: passa rsp (argc, argv...) a vm_main.
 */
/* long long: sotto MinGW (LLP64) long e' a 32 bit */
typedef unsigned long long u64;
typedef long long i64;

static inline i64 sys3(i64 n, i64 a, i64 b, i64 c) {
    i64 r;
    __asm__ volatile ("syscall" : "=a"(r) : "a"(n), "D"(a), "S"(b), "d"(c) : "rcx", "r11", "memory");
    return r;
}

static inline i64 sys6(i64 n, i64 a, i64 b, i64 c, i64 d, i64 e, i64 f) {
    i64 r;
    register i64 r10 __asm__("r10") = d;
    register i64 r8 __asm__("r8") = e;
    register i64 r9 __asm__("r9") = f;
    __asm__ volatile ("syscall" : "=a"(r) : "a"(n), "D"(a), "S"(b), "d"(c), "r"(r10), "r"(r8), "r"(r9)
                      : "rcx", "r11", "memory");
    return r;
}

static u64 parse(const char *s, int base) {
    u64 v = 0;
    for (; *s; s++) {
        int c = *s, d;
        if (c >= '0' && c <= '9') d = c - '0';
        else if (c >= 'a' && c <= 'f') d = c - 'a' + 10;
        else if (c >= 'A' && c <= 'F') d = c - 'A' + 10;
        else if (c == 'x' || c == 'X') { v = 0; continue; }   /* prefisso 0x */
        else break;
        v = v * base + d;
    }
    return v;
}

struct iov { void *base; u64 len; };

/* rsp all'ingresso: argc, argv[0], argv[1], ... */
void vm_main(u64 *sp) {
    i64 argc = (i64)sp[0];
    char **argv = (char **)(sp + 1);
    i64 rc = 1;
    if (argc >= 4) {
        u64 pid = parse(argv[1], 10), addr = parse(argv[2], 16), len = parse(argv[3], 16);
        unsigned char buf[65536];
        rc = 0;
        while (len) {
            u64 n = len < sizeof buf ? len : sizeof buf;
            struct iov local = { buf, n }, remote = { (void *)addr, n };
            i64 got = sys6(310, (i64)pid, (i64)&local, 1, (i64)&remote, 1, 0);
            if (got <= 0) { rc = 2; break; }
            sys3(1, 1, (i64)buf, got);                 /* write(1, buf, got) */
            addr += (u64)got; len -= (u64)got;
        }
    }
    sys3(60, rc, 0, 0);                                /* exit(rc) */
}

__attribute__((naked)) void _start(void) {
    __asm__ volatile (
        "mov %rsp, %rcx\n"        /* primo argomento (ABI Microsoft) = rsp */
        "and $-16, %rsp\n"
        "sub $32, %rsp\n"         /* shadow space dell'ABI Microsoft */
        "call vm_main\n"
        "hlt\n");
}
