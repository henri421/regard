# -*- coding: utf-8 -*-
"""
Régénère les fichiers de recette tests/fixtures/*.json à partir du classeur Excel.
Chaque scénario modifie quelques saisies, fait recalculer le classeur par LibreOffice,
puis relève toutes les valeurs nommées (noms définis) attendues du moteur JavaScript.

Prérequis : Python 3 avec openpyxl, LibreOffice installé.
Usage :
  python tools/generer_regard_maconnerie.py classeur.xlsx
  python tools/make_fixtures.py classeur.xlsx [chemin_vers_soffice]
Exemple Windows : python tools/make_fixtures.py classeur.xlsx "C:/Program Files/LibreOffice/program/soffice.exe"
"""
import sys, json, subprocess, datetime, tempfile, shutil, os
from pathlib import Path
from openpyxl import load_workbook

SRC = Path(sys.argv[1]).resolve()
SOFFICE = sys.argv[2] if len(sys.argv) > 2 else (shutil.which("soffice") or shutil.which("libreoffice") or "soffice")
OUT = Path(__file__).resolve().parent.parent / "tests" / "fixtures"
OUT.mkdir(parents=True, exist_ok=True)

T5 = [[round(0.02 + 0.01 * i + 0.004 * j, 3) for i in range(8)] for j in range(9)]  # valeurs FICTIVES, test d'interpolation
SCENARIOS = {
    "defaut": {},
    "cotes_nappe": {"in_mode": "Cotes", "in_nappe": "Oui", "in_Zn": 298.5, "in_Kchoix": "Ka", "in_comp": "Oui"},
    "lm1_bouss_cheval": {"in_mod": "LM1", "in_optlat": "Boussinesq", "in_pos": "À cheval", "in_chemin": "Bande verticale"},
    "user_tampon": {"in_mod": "Utilisateur", "in_pos": "Sur le tampon", "in_trans": "Charge linéaire saisie", "in_nugm": 20, "in_eu": 0.03, "in_chemin": "Plaque"},
    "pen_brique": {"in_pen": "Les deux", "in_elem": "BTP25-24", "in_mort": "M10-T", "in_cls": 3, "in_liaison": "Relevé béton", "in_la": "Libre", "in_a": 2.5},
    "slw_bouss": {"in_optlat": "Boussinesq", "in_d": 0.3},
    "cave_r2": {"in_hl": 2.6, "in_ec": 0.0, "in_mod": "Utilisateur", "in_qu": 0, "in_P": 0, "in_a": 6.0, "in_b": 4.0},
    "su_lm1_tampon": {"in_su": "Oui", "in_comp": "Oui", "in_c3": "Non", "in_mod": "LM1", "in_pos": "Sur le tampon", "in_tgm": 0.30, "in_elem": "SCP20-24", "in_mort": "M15-G", "in_cls": 2},
    "plaque_t5_fictive": {"in_chemin": "Plaque", "in_pos": "Sur la dalle (hors tampon)", "in_a": 2.2, "in_b": 1.6, "__T5__": T5},
    "beton_cellulaire_mx5": {"in_elem": "BCA4-24", "in_mort": "M5-G", "in_MX": "MX5", "in_hl": 2.0},
}

def named_cell(wb, name):
    key = next(k for k in wb.defined_names.keys() if k.lower() == name.lower())
    (sheet, ref), = list(wb.defined_names[key].destinations)
    return wb[sheet], ref.replace("$", "")

tmp = Path(tempfile.mkdtemp())
for name, changes in SCENARIOS.items():
    wb = load_workbook(SRC)
    for k, v in changes.items():
        if k == "__T5__":
            (sheet, ref), = list(wb.defined_names["t5_grid"].destinations)
            a, b = ref.replace("$", "").split(":")
            for i, row in enumerate(wb[sheet][a:b]):
                for j, c in enumerate(row):
                    c.value = v[i][j]
            continue
        ws, ref = named_cell(wb, k)
        ws[ref].value = v
    raw = tmp / f"{name}.xlsx"
    wb.save(raw)
    subprocess.run([SOFFICE, "--headless", "--calc", "--convert-to", "xlsx:Calc MS Excel 2007 XML", "--outdir", str(tmp / "calc"), str(raw)],
                   check=True, capture_output=True, timeout=300)
    wv = load_workbook(tmp / "calc" / f"{name}.xlsx", data_only=True)
    inputs, expected = {}, {}
    for k in wv.defined_names.keys():
        try:
            (sheet, ref), = list(wv.defined_names[k].destinations)
        except Exception:
            continue
        if ":" in ref:
            continue
        v = wv[sheet][ref.replace("$", "")].value
        if isinstance(v, (datetime.date, datetime.datetime)):
            v = v.strftime("%Y-%m-%d")
        (inputs if k.startswith("in_") else expected)[k[3:] if k.startswith("in_") else k] = v
    errors = [k for k, v in expected.items() if isinstance(v, str) and v.startswith("#")]
    if errors:
        sys.exit(f"{name} : erreurs Excel dans {errors[:5]}")
    fx = {"scenario": name, "inputs": inputs, "tables": ({"t5": changes["__T5__"]} if "__T5__" in changes else {}), "expected": expected}
    (OUT / f"{name}.json").write_text(json.dumps(fx, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{name} : {len(expected)} valeurs")
shutil.rmtree(tmp, ignore_errors=True)
