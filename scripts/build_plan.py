"""Write plan.json (read by the TradingView extension) from the plan definitions in js/.
Run after changing PLAN, WCRIT, DCRIT, EXITS, EXOTHER or the grade criteria/defaults (GR_*):  python3 scripts/build_plan.py"""
import json, pathlib, re, subprocess

root = pathlib.Path(__file__).resolve().parent.parent
src = "\n".join(p.read_text(encoding="utf-8") for p in sorted((root / "js").glob("*.js")))


def literal(name):
    """Source text of `const NAME = [...]` or `{...}`."""
    m = re.search(r"\bconst " + name + r"\s*=\s*", src)
    i, depth, quote = m.end(), 0, None
    for k in range(i, len(src)):
        c = src[k]
        if quote:
            if c == quote and src[k - 1] != "\\":
                quote = None
        elif c in "\"'`":
            quote = c
        elif c in "[{":
            depth += 1
        elif c in "]}":
            depth -= 1
            if depth == 0:
                return src[i : k + 1]
    raise ValueError(name)


names = ["PLAN", "WCRIT", "DCRIT", "EXITS", "EXOTHER", "GR_CRIT", "GR_DEF"]
js = "".join(f"const {n}={literal(n)};" for n in names)
# grade: the criteria and the default rules per phase, so the extension grades the same way as the journal
js += "console.log(JSON.stringify({v:1,plan:PLAN,wcrit:WCRIT,dcrit:DCRIT,exits:EXITS,exother:EXOTHER,phases:[1,2,3,4],grade:{crit:GR_CRIT,def:GR_DEF}}))"
out = subprocess.run(["node", "-e", js], capture_output=True, text=True, check=True).stdout
(root / "plan.json").write_text(out)
print("plan.json", len(out), "bytes")
