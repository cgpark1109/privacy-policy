# Minimal QR code encoder (byte mode, error correction level M, versions 1-10), no dependencies.
# Used by build.py to draw the "scan to install" codes on game pages. qr_svg(text) returns an <svg>.

# Error correction level M: (ECC codewords per block, number of blocks) for versions 1..10
_ECC_M = {1: (10, 1), 2: (16, 1), 3: (26, 1), 4: (18, 2), 5: (24, 2),
          6: (16, 4), 7: (18, 4), 8: (22, 4), 9: (22, 5), 10: (26, 5)}
_FORMAT_M = 0  # format bits for level M


def _gf_mul(x, y):
    z = 0
    for i in reversed(range(8)):
        z = (z << 1) ^ ((z >> 7) * 0x11D)
        z ^= ((y >> i) & 1) * x
    return z


def _rs_divisor(degree):
    result = [0] * (degree - 1) + [1]
    root = 1
    for _ in range(degree):
        for j in range(degree):
            result[j] = _gf_mul(result[j], root)
            if j + 1 < degree:
                result[j] ^= result[j + 1]
        root = _gf_mul(root, 0x02)
    return result


def _rs_remainder(data, divisor):
    result = [0] * len(divisor)
    for b in data:
        factor = b ^ result.pop(0)
        result.append(0)
        for i, coef in enumerate(divisor):
            result[i] ^= _gf_mul(coef, factor)
    return result


def _raw_modules(ver):
    result = (16 * ver + 128) * ver + 64
    if ver >= 2:
        num_align = ver // 7 + 2
        result -= (25 * num_align - 10) * num_align - 55
        if ver >= 7:
            result -= 36
    return result


def _data_codewords(ver):
    ecc_len, blocks = _ECC_M[ver]
    return _raw_modules(ver) // 8 - ecc_len * blocks


def _align_positions(ver, size):
    if ver == 1:
        return []
    num_align = ver // 7 + 2
    step = (ver * 8 + num_align * 3 + 5) // (num_align * 4 - 4) * 2
    result = [6]
    pos = size - 7
    for _ in range(num_align - 1):
        result.insert(1, pos)
        pos -= step
    return result


class _Matrix:
    def __init__(self, ver):
        self.ver = ver
        self.size = ver * 4 + 17
        self.dark = [[False] * self.size for _ in range(self.size)]
        self.func = [[False] * self.size for _ in range(self.size)]

    def set_func(self, x, y, dark):
        self.dark[y][x] = dark
        self.func[y][x] = True

    def draw_function_patterns(self):
        n = self.size
        for i in range(n):
            self.set_func(6, i, i % 2 == 0)
            self.set_func(i, 6, i % 2 == 0)
        for cx, cy in ((3, 3), (n - 4, 3), (3, n - 4)):
            for dy in range(-4, 5):
                for dx in range(-4, 5):
                    x, y = cx + dx, cy + dy
                    if 0 <= x < n and 0 <= y < n:
                        self.set_func(x, y, max(abs(dx), abs(dy)) not in (2, 4))
        pos = _align_positions(self.ver, n)
        last = len(pos) - 1
        for i, ax in enumerate(pos):
            for j, ay in enumerate(pos):
                if (i, j) in ((0, 0), (0, last), (last, 0)):
                    continue
                for dy in range(-2, 3):
                    for dx in range(-2, 3):
                        self.set_func(ax + dx, ay + dy, max(abs(dx), abs(dy)) != 1)
        self.draw_format(0)
        if self.ver >= 7:
            rem = self.ver
            for _ in range(12):
                rem = (rem << 1) ^ ((rem >> 11) * 0x1F25)
            bits = self.ver << 12 | rem
            for i in range(18):
                bit = (bits >> i) & 1 == 1
                a, b = n - 11 + i % 3, i // 3
                self.set_func(a, b, bit)
                self.set_func(b, a, bit)

    def draw_format(self, mask):
        data = _FORMAT_M << 3 | mask
        rem = data
        for _ in range(10):
            rem = (rem << 1) ^ ((rem >> 9) * 0x537)
        bits = (data << 10 | rem) ^ 0x5412
        bit = lambda i: (bits >> i) & 1 == 1  # noqa: E731
        n = self.size
        for i in range(6):
            self.set_func(8, i, bit(i))
        self.set_func(8, 7, bit(6))
        self.set_func(8, 8, bit(7))
        self.set_func(7, 8, bit(8))
        for i in range(9, 15):
            self.set_func(14 - i, 8, bit(i))
        for i in range(8):
            self.set_func(n - 1 - i, 8, bit(i))
        for i in range(8, 15):
            self.set_func(8, n - 15 + i, bit(i))
        self.set_func(8, n - 8, True)

    def draw_codewords(self, data):
        n, i = self.size, 0
        right = n - 1
        while right >= 1:
            if right == 6:
                right = 5
            for vert in range(n):
                for j in range(2):
                    x = right - j
                    upward = ((right + 1) & 2) == 0
                    y = n - 1 - vert if upward else vert
                    if not self.func[y][x] and i < len(data) * 8:
                        self.dark[y][x] = (data[i >> 3] >> (7 - (i & 7))) & 1 == 1
                        i += 1
            right -= 2

    def apply_mask(self, mask):
        tests = [lambda x, y: (x + y) % 2 == 0, lambda x, y: y % 2 == 0, lambda x, y: x % 3 == 0,
                 lambda x, y: (x + y) % 3 == 0, lambda x, y: (x // 3 + y // 2) % 2 == 0,
                 lambda x, y: x * y % 2 + x * y % 3 == 0, lambda x, y: (x * y % 2 + x * y % 3) % 2 == 0,
                 lambda x, y: ((x + y) % 2 + x * y % 3) % 2 == 0]
        test = tests[mask]
        for y in range(self.size):
            for x in range(self.size):
                if not self.func[y][x] and test(x, y):
                    self.dark[y][x] = not self.dark[y][x]

    def penalty(self):
        n, score = self.size, 0
        lines = [row[:] for row in self.dark] + [[self.dark[y][x] for y in range(n)] for x in range(n)]
        for line in lines:
            run, prev = 0, None
            for m in line:
                if m == prev:
                    run += 1
                else:
                    if run >= 5:
                        score += run - 2
                    run, prev = 1, m
            if run >= 5:
                score += run - 2
            s = "".join("1" if m else "0" for m in line)
            padded = "0000" + s + "0000"
            for pat in ("00001011101", "10111010000"):
                start = padded.find(pat)
                while start != -1:
                    score += 40
                    start = padded.find(pat, start + 1)
        for y in range(n - 1):
            for x in range(n - 1):
                c = self.dark[y][x]
                if c == self.dark[y][x + 1] == self.dark[y + 1][x] == self.dark[y + 1][x + 1]:
                    score += 3
        dark = sum(sum(row) for row in self.dark)
        total = n * n
        k = (abs(dark * 20 - total * 10) + total - 1) // total - 1
        return score + max(k, 0) * 10


def qr_matrix(text):
    data = text.encode("utf-8")
    for ver in range(1, 11):
        count_bits = 8 if ver <= 9 else 16
        if 4 + count_bits + 8 * len(data) <= _data_codewords(ver) * 8:
            break
    else:
        raise ValueError("text too long for a version 1-10 QR code")
    capacity = _data_codewords(ver) * 8
    bits = [0, 1, 0, 0] + [(len(data) >> i) & 1 for i in reversed(range(count_bits))]
    for b in data:
        bits += [(b >> i) & 1 for i in reversed(range(8))]
    bits += [0] * min(4, capacity - len(bits))
    bits += [0] * (-len(bits) % 8)
    codewords = [int("".join(map(str, bits[i:i + 8])), 2) for i in range(0, len(bits), 8)]
    pad = 0xEC
    while len(codewords) < capacity // 8:
        codewords.append(pad)
        pad ^= 0xEC ^ 0x11

    ecc_len, num_blocks = _ECC_M[ver]
    raw = _raw_modules(ver) // 8
    num_short = num_blocks - raw % num_blocks
    short_len = raw // num_blocks
    divisor = _rs_divisor(ecc_len)
    blocks, k = [], 0
    for i in range(num_blocks):
        dlen = short_len - ecc_len + (0 if i < num_short else 1)
        dat = codewords[k:k + dlen]
        k += dlen
        blocks.append((dat, _rs_remainder(dat, divisor)))
    final = []
    for i in range(max(len(d) for d, _ in blocks)):
        final += [d[i] for d, _ in blocks if i < len(d)]
    for i in range(ecc_len):
        final += [e[i] for _, e in blocks]

    best = None
    for mask in range(8):
        m = _Matrix(ver)
        m.draw_function_patterns()
        m.draw_codewords(final)
        m.apply_mask(mask)
        m.draw_format(mask)
        score = m.penalty()
        if best is None or score < best[0]:
            best = (score, m)
    return best[1].dark


def qr_svg(text, label="QR code"):
    dark = qr_matrix(text)
    n, quiet = len(dark), 4
    path = "".join(f"M{x + quiet},{y + quiet}h1v1h-1z" for y in range(n) for x in range(n) if dark[y][x])
    size = n + 2 * quiet
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" role="img" aria-label="{label}" '
            f'shape-rendering="crispEdges"><rect width="{size}" height="{size}" fill="#fff"/>'
            f'<path d="{path}" fill="#2B3155"/></svg>')
