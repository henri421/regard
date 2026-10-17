# -*- coding: utf-8 -*-
"""
Génère le classeur Excel de vérification des regards en maçonnerie enterrée.
Cahier des charges : "Cahier des charges : vérification des regards en maçonnerie enterrée".
EN 1996-1-1:2005+A1:2012, EN 1996-2, EN 1996-3, EN 1997-1, EN 1990, EN 1991-2, DIN 1072.

Usage : python generer_regard_maconnerie.py [fichier_sortie.xlsx]
Aucune macro, aucun VBA. Toutes les valeurs calculées sont des formules Excel.
"""
import sys
import datetime
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment, Protection
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter as CL

OUT = sys.argv[1] if len(sys.argv) > 1 else "Verification_regard_maconnerie.xlsx"
VERSION = "v1.1 (2026-10-16)"

# Styles
FN = "Arial"
F_N = Font(name=FN, size=9)
F_B = Font(name=FN, size=9, bold=True)
F_T = Font(name=FN, size=12, bold=True)
F_S = Font(name=FN, size=10, bold=True)
F_IN = Font(name=FN, size=9, color="0000FF")
F_Q = Font(name=FN, size=8, italic=True, color="595959")
F_AUX = Font(name=FN, size=8, color="808080")
FILL_IN = PatternFill("solid", fgColor="E7E6E6")
FILL_H = PatternFill("solid", fgColor="F2F2F2")
TH = Side(style="thin")
MD = Side(style="medium")
BOX = Border(left=MD, right=MD, top=MD, bottom=MD)
B_BOT = Border(bottom=TH)
B_ALL = Border(left=TH, right=TH, top=TH, bottom=TH)
WRAP = Alignment(wrap_text=True, vertical="top")
CENTER = Alignment(horizontal="center", vertical="top", wrap_text=True)
UNLOCK = Protection(locked=False)

wb = Workbook()


def add_name(name, ws, col, row, col2=None, row2=None):
    ref = f"'{ws.title}'!${CL(col)}${row}"
    if col2 is not None:
        ref += f":${CL(col2)}${row2}"
    wb.defined_names[name] = DefinedName(name, attr_text=ref)


def style_input(c):
    c.font = F_IN
    c.fill = FILL_IN
    c.protection = UNLOCK


def page_setup(ws, last_col, last_row, title_rows="1:3"):
    ws.page_setup.orientation = "portrait"
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.print_title_rows = title_rows
    ws.print_area = f"A1:{CL(last_col)}{last_row}"
    ws.page_margins.left = 0.5
    ws.page_margins.right = 0.4
    ws.page_margins.top = 0.6
    ws.page_margins.bottom = 0.6
    ws.oddFooter.left.text = "&A"
    ws.oddFooter.left.font = FN
    ws.oddFooter.center.text = "Page &P / &N"
    ws.oddFooter.right.text = VERSION
    ws.sheet_view.showGridLines = False


class Writer:
    """Écrit des lignes : Désignation | Symbole | Valeur(s) | Unité | Formule | Référence."""

    def __init__(self, ws, nv, sheet_title, widths):
        self.ws = ws
        self.nv = nv
        self.cU = 3 + nv
        self.cF = 4 + nv
        self.cR = 5 + nv
        self.last = self.cR
        for i, w in enumerate(widths, start=1):
            ws.column_dimensions[CL(i)].width = w
        ws.cell(1, 1, sheet_title).font = F_T
        c = ws.cell(2, 1, '="Projet : "&in_projet&"     Réf. : "&in_ref&"     Indice : "&in_ind&"     Auteur : "&in_auteur')
        c.font = F_N
        c = ws.cell(2, self.last, "=in_date")
        c.font = F_N
        c.number_format = "dd/mm/yyyy"
        heads = ["Désignation", "Symbole"] + (["Valeur"] if nv == 1 else ["Grand mur", "Petit mur"]) + ["Unité", "Formule", "Référence"]
        for i, h in enumerate(heads, start=1):
            c = ws.cell(3, i, h)
            c.font = F_B
            c.fill = FILL_H
            c.border = B_ALL
            c.alignment = CENTER
        self.r = 4

    def blank(self, n=1):
        self.r += n

    def section(self, text):
        self.r += 1
        c = self.ws.cell(self.r, 1, text)
        c.font = F_S
        for col in range(1, self.last + 1):
            self.ws.cell(self.r, col).border = B_BOT
        self.r += 1

    def note(self, text):
        c = self.ws.cell(self.r, 1, text)
        c.font = F_Q
        c.alignment = Alignment(wrap_text=True, vertical="top")
        self.ws.merge_cells(start_row=self.r, start_column=1, end_row=self.r, end_column=self.last)
        self.ws.row_dimensions[self.r].height = 11.5 * (1 + len(text) // 115)
        self.r += 1

    def line(self, desig, sym, vals, unit="", ftxt="", ref="", names=None, inp=False, fmt="0.00", verdict=False, lst=None):
        ws = self.ws
        r = self.r
        if not isinstance(vals, (list, tuple)):
            vals = [vals] * self.nv if self.nv == 1 else [vals, vals]
        ws.cell(r, 1, desig).font = F_N
        ws.cell(r, 1).alignment = WRAP
        ws.cell(r, 2, sym).font = F_N
        ws.cell(r, 2).alignment = CENTER
        for k, v in enumerate(vals):
            c = ws.cell(r, 3 + k, v)
            c.font = F_N
            c.number_format = fmt
            c.alignment = Alignment(horizontal="center", vertical="top")
            if inp:
                style_input(c)
                if lst:
                    dv = DataValidation(type="list", formula1=lst, allow_blank=False)
                    ws.add_data_validation(dv)
                    dv.add(c)
            if verdict:
                c.font = F_B
                c.border = BOX
                c.alignment = Alignment(horizontal="center", vertical="top", shrink_to_fit=True)
            if names:
                if isinstance(names, (list, tuple)):
                    nm = names[k]
                else:
                    nm = names if k == 0 else None
                if nm:
                    add_name(nm, ws, 3 + k, r)
        ws.cell(r, self.cU, unit).font = F_N
        ws.cell(r, self.cU).alignment = CENTER
        ws.cell(r, self.cF, ftxt).font = F_N
        ws.cell(r, self.cF).alignment = WRAP
        ws.cell(r, self.cR, ref).font = F_Q
        ws.cell(r, self.cR).alignment = WRAP
        self.r += 1
        return r


def W2(tpl):
    """Formule par mur : {w} -> gm / pm, {o} -> mur orthogonal."""
    out = [tpl.format(w="gm", o="pm"), tpl.format(w="pm", o="gm")]
    return [x if x.startswith("=") else "=" + x for x in out]


def N2(base):
    return [f"{base}_gm", f"{base}_pm"]


# ---------------------------------------------------------------------------
# Formules réutilisées
# ---------------------------------------------------------------------------
def soil_k(z):
    return f"IF({z}<=z_nap,K_pou*gam_sol*{z},K_pou*(gam_sol*z_nap+gam_dej*({z}-z_nap))+gam_w*({z}-z_nap))"


def bouss(x, y, q, z):
    xx = f"MAX({x},0.01)"
    m = f"({xx}/z_pied)"
    n = f"({z}/z_pied)"
    return (f"IF({q}=0,0,IF({m}<=0.4,0.28*{q}/z_pied^2*{n}^2/(0.16+{n}^2)^3,"
            f"1.77*{q}/z_pied^2*{m}^2*{n}^2/({m}^2+{n}^2)^3)*COS(1.1*ATAN({y}/{xx}))^2)")


# ===========================================================================
# 1_Coefficients
# ===========================================================================
wsC = wb.active
wsC.title = "1_Coefficients"
# Les feuilles sont créées dans l'ordre d'affichage ensuite
wsS = wb.create_sheet("0_Saisie", 0)
wsK = wb.create_sheet("2_Catalogue")
wsP = wb.create_sheet("3_Predim")
wsL = wb.create_sheet("4_Classique")
wsM = wb.create_sheet("5_Complete")
wsY = wb.create_sheet("6_Synthese")


def table_header(ws, r, heads, c0=1):
    for i, h in enumerate(heads):
        c = ws.cell(r, c0 + i, h)
        c.font = F_B
        c.fill = FILL_H
        c.border = B_ALL
        c.alignment = CENTER


def table_rows(ws, r0, rows, input_cols, fmts=None, c0=1):
    for i, row in enumerate(rows):
        for j, v in enumerate(row):
            c = ws.cell(r0 + i, c0 + j, v)
            c.font = F_N
            c.border = B_ALL
            c.alignment = Alignment(horizontal="center", vertical="top", wrap_text=True)
            if fmts and fmts[j]:
                c.number_format = fmts[j]
            if j in input_cols:
                style_input(c)
    return r0 + len(rows)


def coef_sheet():
    ws = wsC
    widths = [26, 13, 13, 13, 13, 13, 13, 13, 13]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[CL(i)].width = w
    ws.cell(1, 1, "1_Coefficients : tables normatives et paramètres d'annexe nationale").font = F_T
    ws.cell(2, 1, '="Projet : "&in_projet&"     Réf. : "&in_ref&"     Indice : "&in_ind').font = F_N
    ws.cell(3, 1, "Valeurs pré-remplies À VÉRIFIER par l'ingénieur avant usage (fond gris, police bleue = modifiable).").font = F_Q
    r = 5

    def title(t):
        nonlocal r
        c = ws.cell(r, 1, t)
        c.font = F_S
        r += 1

    # T1 gamma_M
    title("T1  Coefficient partiel γM de la maçonnerie (EN 1996-1-1 Tab. 2.3, valeurs recommandées, ANL à confirmer)")
    table_header(ws, r, ["Classe d'exécution", "Cat. I, mortier performanciel", "Cat. I recette ou cat. II"])
    r += 1
    r0 = r
    r = table_rows(ws, r, [[1, 1.5, 1.7], [2, 1.7, 2.0], [3, 2.0, 2.2], [4, 2.2, 2.5], [5, 2.5, 2.7]], [1, 2], ["0", "0.00", "0.00"])
    add_name("t1_tab", ws, 2, r0, 3, r - 1)
    r += 1

    # T2 K alpha beta
    title("T2  Résistance caractéristique en compression fk = K·fb^α·fm^β (EN 1996-1-1 Tab. 3.3)")
    table_header(ws, r, ["Clé (type|groupe|mortier)", "Type", "Groupe", "Mortier", "K", "α", "β"])
    r += 1
    rows = []
    G = [("Terre cuite", 1, 0.55), ("Terre cuite", 2, 0.45), ("Terre cuite", 3, 0.35), ("Terre cuite", 4, 0.35),
         ("Silico-calcaire", 1, 0.55), ("Silico-calcaire", 2, 0.45),
         ("Béton de granulats", 1, 0.55), ("Béton de granulats", 2, 0.52), ("Béton de granulats", 3, 0.40), ("Béton de granulats", 4, 0.40),
         ("Béton cellulaire", 1, 0.55)]
    T = [("Terre cuite", 1, 0.75), ("Terre cuite", 2, 0.70), ("Terre cuite", 3, 0.50),
         ("Silico-calcaire", 1, 0.80), ("Silico-calcaire", 2, 0.65),
         ("Béton de granulats", 1, 0.80), ("Béton de granulats", 2, 0.65), ("Béton de granulats", 3, 0.50),
         ("Béton cellulaire", 1, 0.80)]
    for t, g, k in G:
        rows.append([f"{t}|{g}|G", t, g, "G (usage courant)", k, 0.70, 0.30])
    for t, g, k in T:
        rows.append([f"{t}|{g}|T", t, g, "T (joint mince)", k, 0.85, 0.00])
    r0 = r
    r = table_rows(ws, r, rows, [4, 5, 6], [None, None, "0", None, "0.00", "0.00", "0.00"])
    add_name("t2_key", ws, 1, r0, 1, r - 1)
    add_name("t2_K", ws, 5, r0, 5, r - 1)
    add_name("t2_alpha", ws, 6, r0, 6, r - 1)
    add_name("t2_beta", ws, 7, r0, 7, r - 1)
    ws.cell(r, 1, "Groupe 1 avec joint longitudinal : multiplier K par 0,8. Joints minces et terre cuite des groupes 2 et 3 : exposants à vérifier.").font = F_Q
    r += 2

    # T3 fvk0
    title("T3  Résistance initiale au cisaillement fvk0 (EN 1996-1-1 Tab. 3.4)")
    table_header(ws, r, ["Clé (type|classe)", "Type", "Classe de mortier", "fvk0 (N/mm²)"])
    r += 1
    rows = []
    for t, vals in [("Terre cuite", (0.30, 0.20, 0.10, 0.30)), ("Silico-calcaire", (0.20, 0.15, 0.10, 0.40)),
                    ("Béton de granulats", (0.20, 0.15, 0.10, 0.40)), ("Béton cellulaire", (0.20, 0.15, 0.10, 0.40))]:
        for band, v in zip(["M10-M20", "M2,5-M9", "M1-M2", "Joint mince"], vals):
            rows.append([f"{t}|{band}", t, band, v])
    r0 = r
    r = table_rows(ws, r, rows, [3], [None, None, None, "0.00"])
    add_name("t3_key", ws, 1, r0, 1, r - 1)
    add_name("t3_val", ws, 4, r0, 4, r - 1)
    ws.cell(r, 1, "Limite fvlt prise égale à 0,065·fb (EN 1996-1-1 §3.6.2, à confirmer selon l'ANL).").font = F_Q
    r += 2

    # T4 fxk
    title("T4  Résistances caractéristiques en flexion fxk1 (rupture parallèle aux joints) et fxk2 (EN 1996-1-1 Tab. 3.6 et 3.7)")
    table_header(ws, r, ["Clé (type|fm)", "Type", "Mortier", "fxk1 (N/mm²)", "fxk2 (N/mm²)"])
    r += 1
    rows = []
    for t, a, b in [("Terre cuite", (0.10, 0.40), (0.10, 0.40)), ("Silico-calcaire", (0.05, 0.20), (0.10, 0.40)),
                    ("Béton de granulats", (0.05, 0.20), (0.10, 0.40)), ("Béton cellulaire", (0.05, 0.20), (0.10, 0.40))]:
        rows.append([f"{t}|fm<5", t, "fm < 5", a[0], a[1]])
        rows.append([f"{t}|fm>=5", t, "fm ≥ 5", b[0], b[1]])
    r0 = r
    r = table_rows(ws, r, rows, [3, 4], [None, None, None, "0.00", "0.00"])
    add_name("t4_key", ws, 1, r0, 1, r - 1)
    add_name("t4_x1", ws, 4, r0, 4, r - 1)
    add_name("t4_x2", ws, 5, r0, 5, r - 1)
    r += 1

    # T5 annex E
    title("T5  Coefficient de moment α2, panneau sur 4 bords simplement appuyés (EN 1996-1-1 annexe E) : À TRANSCRIRE")
    ws.cell(r, 1, "Lignes : μ = fxk1/fxk2 croissant. Colonnes : h/L croissant. Laisser vide désactive la vérification en plaque.").font = F_Q
    r += 1
    xs = [0.30, 0.50, 0.75, 1.00, 1.25, 1.50, 1.75, 2.00]
    ys = [0.30, 0.35, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90, 1.00]
    table_header(ws, r, ["μ  \\  h/L"] + xs)
    for j in range(len(xs)):
        ws.cell(r, 2 + j).number_format = "0.00"
    add_name("t5_x", ws, 2, r, 1 + len(xs), r)
    r += 1
    r0 = r
    for i, y in enumerate(ys):
        c = ws.cell(r, 1, y)
        c.font = F_B
        c.border = B_ALL
        c.number_format = "0.00"
        c.alignment = Alignment(horizontal="center")
        for j in range(len(xs)):
            c = ws.cell(r, 2 + j, None)
            c.border = B_ALL
            c.number_format = "0.000"
            style_input(c)
        r += 1
    add_name("t5_y", ws, 1, r0, 1, r - 1)
    add_name("t5_grid", ws, 2, r0, 1 + len(xs), r - 1)
    r += 1

    # T6 delta
    title("T6  Facteur de forme δ (EN 772-1 annexe A), pour mémoire : δ est saisi dans le catalogue")
    table_header(ws, r, ["Hauteur (mm) \\ largeur (mm)", 50, 100, 150, 200, "≥ 250"])
    r += 1
    d = [[40, 0.80, 0.70, None, None, None], [50, 0.85, 0.75, 0.70, None, None], [65, 0.95, 0.85, 0.75, 0.70, 0.65],
         [100, 1.15, 1.00, 0.90, 0.80, 0.75], [150, 1.30, 1.20, 1.10, 1.00, 0.95], [200, 1.45, 1.35, 1.25, 1.15, 1.10],
         ["≥ 250", 1.55, 1.45, 1.35, 1.25, 1.15]]
    r = table_rows(ws, r, d, [1, 2, 3, 4, 5], [None] + ["0.00"] * 5)
    r += 1

    # T7 MX
    title("T7  Classes d'exposition (EN 1996-2 annexe A)")
    table_header(ws, r, ["Classe", "Environnement", "", "", "Exemple pour un regard"])
    ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=4)
    r += 1
    mx = [["MX1", "Sec", "Sans objet en enterré"], ["MX2", "Humide, sans gel", "Regard hors gel, eaux claires"],
          ["MX3", "Humide avec cycles de gel", "Regard sous chaussée, partie haute"],
          ["MX4", "Air salin, eau de mer ou sels de déverglaçage", "Regard sous chaussée salée"],
          ["MX5", "Milieu chimique agressif", "Regard d'eaux usées (H2S, sulfates)"]]
    for row in mx:
        ws.cell(r, 1, row[0]).font = F_N
        ws.cell(r, 2, row[1]).font = F_N
        ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=4)
        ws.cell(r, 5, row[2]).font = F_N
        ws.merge_cells(start_row=r, start_column=5, end_row=r, end_column=8)
        r += 1
    r += 1

    # T8 trafic
    title("T8  Modèles de charge de trafic")
    ws.cell(r, 1, "Coefficients d'ajustement LM1 (ANL EN 1991-2)").font = F_N
    ws.cell(r, 2, "αQ1").font = F_N
    c = ws.cell(r, 3, 1.0)
    style_input(c)
    add_name("alpha_Q", ws, 3, r)
    ws.cell(r, 4, "αq1").font = F_N
    c = ws.cell(r, 5, 1.0)
    style_input(c)
    add_name("alpha_udl", ws, 5, r)
    r += 1
    table_header(ws, r, ["Paramètre", "SLW 60", "LM1", "Utilisateur", "Unité", "Source"])
    add_name("t8_head", ws, 2, r, 4, r)
    r += 1
    rows = [
        ("Charge par roue Pw", "t8_Pw", 100, "=150*alpha_Q", "=in_P", "kN", "DIN 1072 ; EN 1991-2 §4.3.2"),
        ("Roues par essieu", "t8_nw", 2, 2, 1, "", ""),
        ("Nombre d'essieux", "t8_na", 3, 2, 1, "", ""),
        ("Espacement des essieux", "t8_s", 1.50, 1.20, 0, "m", ""),
        ("Voie (entraxe des roues)", "t8_v", 2.00, 2.00, 0, "m", ""),
        ("Empreinte transversale a0", "t8_a0", 0.60, 0.40, "=in_a0", "m", ""),
        ("Empreinte longitudinale b0", "t8_b0", 0.20, 0.40, "=in_b0", "m", ""),
        ("Surcharge équivalente sur remblai", "t8_q", 33.3, "=alpha_Q*600/(3*2.2)+alpha_udl*9", "=in_qu", "kPa",
         "SLW 60 : 600 kN / (3 × 6 m) ; LM1 : TS sur 3,0 × 2,2 m (§4.9.1) + UDL, à vérifier"),
        ("Coefficient partiel γQ", "t8_gQ", 1.50, 1.35, 1.50, "", "EN 1990 annexe A2 ; SLW 60 sans coef. dynamique : 1,50"),
    ]
    for lab, nm, a, b, c3, u, src in rows:
        ws.cell(r, 1, lab).font = F_N
        for j, v in enumerate([a, b, c3]):
            c = ws.cell(r, 2 + j, v)
            c.font = F_N
            c.border = B_ALL
            c.number_format = "0.00"
            c.alignment = Alignment(horizontal="center")
            if not (isinstance(v, str) and v.startswith("=")):
                style_input(c)
        ws.cell(r, 5, u).font = F_N
        ws.cell(r, 6, src).font = F_Q
        add_name(nm, ws, 2, r, 4, r)
        r += 1
    ws.cell(r, 1, "Aucun coefficient dynamique n'est appliqué au SLW 60 (choix du projet).").font = F_Q
    r += 2

    # T9 partiels
    title("T9  Coefficients partiels sur les actions (EN 1990, EN 1997-1, ANL à confirmer)")
    for lab, nm, v, src in [("γG,sup (défavorable)", "gG_sup", 1.35, "EN 1990 Tab. A1.2(B)"),
                            ("γG,inf (favorable)", "gG_inf", 1.00, "EN 1990 Tab. A1.2(B)"),
                            ("γG,stb (soulèvement UPL)", "gG_upl_stb", 0.90, "EN 1997-1 Tab. A.15"),
                            ("γG,dst (soulèvement UPL)", "gG_upl_dst", 1.00, "EN 1997-1 Tab. A.15")]:
        ws.cell(r, 1, lab).font = F_N
        c = ws.cell(r, 2, v)
        style_input(c)
        c.number_format = "0.00"
        ws.cell(r, 3, src).font = F_Q
        add_name(nm, ws, 2, r)
        r += 1
    r += 1

    # T10 constantes
    title("T10  Constantes et hypothèses de calcul")
    for lab, nm, v, src in [("KE (E = KE·fk)", "K_E", 1000, "EN 1996-1-1 §3.7.2"),
                            ("Poids volumique de l'eau γw (kN/m³)", "gam_w", 10, ""),
                            ("Poids volumique du béton armé (kN/m³)", "gam_beton", 25, "EN 1991-1-1"),
                            ("Élancement limite λc pour ek = 0", "lam_c", 15, "EN 1996-1-1 §6.1.2.2(2)"),
                            ("Facteur ρ2 (mur tenu en tête et en pied)", "rho_2", 0.75, "EN 1996-1-1 §5.5.1.2"),
                            ("Excentricité d'appui de la dalle e0/t", "e0_rel", 1 / 6, "Hypothèse : résultante au tiers intérieur"),
                            ("Limite d'excentricité de stabilité e/t", "e_lim", 0.45, "Hypothèse de l'outil")]:
        ws.cell(r, 1, lab).font = F_N
        c = ws.cell(r, 2, v)
        style_input(c)
        c.number_format = "0.000" if isinstance(v, float) else "0"
        ws.cell(r, 3, src).font = F_Q
        add_name(nm, ws, 2, r)
        r += 1
    r += 1
    title("Coefficient de fluage final φ∞ par type d'élément (EN 1996-1-1 Tab. 3.8, valeurs moyennes)")
    table_header(ws, r, ["Type", "φ∞"])
    r += 1
    r0 = r
    r = table_rows(ws, r, [["Terre cuite", 1.0], ["Silico-calcaire", 1.5], ["Béton de granulats", 1.5], ["Béton cellulaire", 1.0]], [1], [None, "0.0"])
    add_name("t10_type", ws, 1, r0, 1, r - 1)
    add_name("t10_phi", ws, 2, r0, 2, r - 1)
    page_setup(ws, 9, r)


coef_sheet()


# ===========================================================================
# 2_Catalogue
# ===========================================================================
def cat_sheet():
    ws = wsK
    widths = [11, 22, 9, 6, 6, 13, 9, 11, 9, 6, 9, 12, 7, 11]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[CL(i)].width = w
    ws.cell(1, 1, "2_Catalogue : éléments, mortiers, ciments (valeurs génériques à remplacer par les fiches fabricant)").font = F_T
    ws.cell(2, 1, '="Projet : "&in_projet&"     Réf. : "&in_ref&"     Indice : "&in_ind').font = F_N
    ws.cell(3, 1, "Ajouter une ligne : insérer DANS la plage (avant la dernière ligne) pour que les listes de la saisie la prennent en compte.").font = F_Q
    r = 5
    ws.cell(r, 1, "Éléments de maçonnerie (EN 771)").font = F_S
    r += 1
    table_header(ws, r, ["Code", "Type (désignation)", "Norme", "Groupe", "Cat.", "Type pour tables", "l×t×h (mm)",
                         "Déclaration", "f déclarée (N/mm²)", "δ", "fb (N/mm²)", "Usage enterré", "MX max", "Source"])
    r += 1
    rows = [
        ["BBP15-24", "Bloc béton plein", "EN 771-3", 1, "I", "Béton de granulats", "490×240×190", "Normalisée", 15, 1.0, None, "Admis", 5, "Générique"],
        ["BBP20-24", "Bloc béton plein", "EN 771-3", 1, "I", "Béton de granulats", "490×240×190", "Normalisée", 20, 1.0, None, "Admis", 5, "Générique"],
        ["BBC10-20", "Bloc béton creux", "EN 771-3", 2, "I", "Béton de granulats", "490×200×190", "Normalisée", 10, 1.0, None, "Déconseillé", 3, "Générique"],
        ["BTP25-24", "Brique terre cuite pleine", "EN 771-1", 1, "I", "Terre cuite", "240×115×71", "Moyenne", 28, 0.90, None, "Admis", 5, "Générique"],
        ["BTP15-24", "Brique terre cuite perforée", "EN 771-1", 2, "I", "Terre cuite", "300×240×238", "Normalisée", 15, 1.0, None, "Déconseillé", 3, "Générique"],
        ["SCP20-24", "Bloc silico-calcaire plein", "EN 771-2", 1, "I", "Silico-calcaire", "248×240×248", "Normalisée", 20, 1.0, None, "Admis", 4, "Générique"],
        ["BCA4-24", "Béton cellulaire", "EN 771-4", 1, "I", "Béton cellulaire", "600×240×250", "Normalisée", 4, 1.0, None, "Déconseillé", 2, "Générique"],
    ]
    r0 = r
    for i, row in enumerate(rows):
        rr = r0 + i
        row[10] = f'=IF(H{rr}="Normalisée",I{rr},I{rr}*J{rr})'
    r = table_rows(ws, r, rows, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13], [None, None, None, "0", None, None, None, None, "0.0", "0.00", "0.0", None, "0", None])
    for nm, col in [("cat_code", 1), ("cat_type", 6), ("cat_grp", 4), ("cat_cat", 5), ("cat_fb", 11), ("cat_usage", 12), ("cat_mx", 13)]:
        add_name(nm, ws, col, r0, col, r - 1)
    dv = DataValidation(type="list", formula1='"Terre cuite,Silico-calcaire,Béton de granulats,Béton cellulaire"')
    ws.add_data_validation(dv)
    dv.add(f"F{r0}:F{r-1}")
    dv2 = DataValidation(type="list", formula1='"Normalisée,Moyenne"')
    ws.add_data_validation(dv2)
    dv2.add(f"H{r0}:H{r-1}")
    dv3 = DataValidation(type="list", formula1='"Admis,Déconseillé,Exclu"')
    ws.add_data_validation(dv3)
    dv3.add(f"L{r0}:L{r-1}")
    ws.cell(r, 1, "Déclaration « Moyenne » : fb = δ·f (δ selon T6). Béton cellulaire et groupes 3 et 4 : déconseillés en enterré.").font = F_Q
    r += 2

    ws.cell(r, 1, "Mortiers de montage (EN 998-2)").font = F_S
    r += 1
    table_header(ws, r, ["Code", "Désignation", "Classe", "Type", "fm", "Conception", "MX max", "Source"])
    r += 1
    rows = [["M5-G", "Mortier d'usage courant", "M5", "G", 5, "Performanciel", 3, "Générique"],
            ["M10-G", "Mortier d'usage courant", "M10", "G", 10, "Performanciel", 5, "Générique"],
            ["M15-G", "Mortier d'usage courant", "M15", "G", 15, "Performanciel", 5, "Générique"],
            ["M20-G", "Mortier d'usage courant", "M20", "G", 20, "Performanciel", 5, "Générique"],
            ["M10-R", "Mortier de recette 1:3 (CEM III/A)", "M10", "G", 10, "Recette", 5, "Générique"],
            ["M10-T", "Mortier joint mince", "M10", "T", 10, "Performanciel", 4, "Générique"]]
    r0 = r
    r = table_rows(ws, r, rows, [0, 1, 2, 3, 4, 5, 6, 7], [None, None, None, None, "0.0", None, "0", None])
    for nm, col in [("mo_code_l", 1), ("mo_type_l", 4), ("mo_fm_l", 5), ("mo_conc_l", 6), ("mo_mx_l", 7)]:
        add_name(nm, ws, col, r0, col, r - 1)
    r += 1

    ws.cell(r, 1, "Ciments (EN 197-1), pour la composition du mortier et du béton de relevé").font = F_S
    r += 1
    table_header(ws, r, ["Code", "Désignation", "", "SR", "Tenue chimique", "", "Usage recommandé", ""])
    r += 1
    rows = [["CEM I", "CEM I 42,5 R", "", "Non", "Faible", "", "Hors gel, eaux claires"],
            ["CEM II", "CEM II/A-LL 42,5 N", "", "Non", "Moyenne", "", "Usage courant, MX2 à MX3"],
            ["CEM III/A", "CEM III/A 42,5 N", "", "Selon fiche", "Bonne", "", "Regards, MX3 à MX5 (défaut)"],
            ["CEM III/B", "CEM III/B 42,5 N-LH/SR", "", "Oui", "Très bonne", "", "Eaux usées agressives, MX5"]]
    r = table_rows(ws, r, rows, [0, 1, 3, 4, 6], None)
    ws.cell(r, 1, "Regard d'eaux usées : prévoir un revêtement intérieur contre la corrosion biogène, quel que soit le ciment.").font = F_Q
    page_setup(ws, 14, r)


cat_sheet()

# ===========================================================================
# 0_Saisie
# ===========================================================================
S = Writer(wsS, 1, "0_Saisie : données d'entrée et actions", [33, 9, 12, 7, 38, 18])
wsS.cell(4, 1, "Légende : saisie = fond gris, police bleue ; calcul = sans fond ; verdict = encadré. Aucune macro.").font = F_Q
S.r = 5

S.section("A. Projet")
S.line("Projet", "", "Regard type (exemple)", names="in_projet", inp=True, fmt="@")
S.line("Référence", "", "BE-2026-000", names="in_ref", inp=True, fmt="@")
S.line("Indice", "", "A", names="in_ind", inp=True, fmt="@")
S.line("Date du calcul", "", datetime.date(2026, 10, 15), names="in_date", inp=True, fmt="dd/mm/yyyy")
S.line("Auteur", "", "", names="in_auteur", inp=True, fmt="@")

S.section("B. Géométrie")
S.line("Mode de saisie de la géométrie", "", "Dimensions", "", "Dimensions ou Cotes", "", "in_mode", True, "@", lst='"Dimensions,Cotes"')
S.line("Longueur intérieure (grands murs)", "a", 1.50, "m", "a ≥ b", "", "in_a", True)
S.line("Largeur intérieure (petits murs)", "b", 1.50, "m", "", "", "in_b", True)
S.line("Épaisseur des grands murs", "t1", 0.24, "m", "", "", "in_tgm", True)
S.line("Épaisseur des petits murs", "t2", 0.24, "m", "", "", "in_tpm", True)
S.line("Épaisseur de la dalle supérieure", "td", 0.20, "m", "", "", "in_td", True)
S.line("Épaisseur du radier", "tr", 0.20, "m", "", "", "in_tr", True)
S.line("Ouverture du tampon (centrée, alignée)", "at", 0.60, "m", "", "", "in_at", True)
S.line("Ouverture du tampon (centrée, alignée)", "bt", 0.60, "m", "", "", "in_bt", True)
S.line("Mode Dimensions : hauteur libre intérieure", "hl", 2.50, "m", "", "", "in_hl", True)
S.line("Mode Dimensions : recouvrement sur dalle", "ec", 0.30, "m", "chaussée comprise", "", "in_ec", True)
S.line("Mode Cotes : terrain fini", "ZTN", 300.00, "m NGL", "", "", "in_ZTN", True)
S.line("Mode Cotes : dessus de dalle", "Zd", 299.70, "m NGL", "", "", "in_Zd", True)
S.line("Mode Cotes : dessus de radier", "Zr", 297.00, "m NGL", "", "", "in_Zr", True)
S.line("Recouvrement retenu", "ec", '=IF(in_mode="Cotes",in_ZTN-in_Zd,in_ec)', "m", "ZTN − Zd ou saisie", "", "ec")
S.line("Hauteur libre retenue", "hl", '=IF(in_mode="Cotes",in_Zd-in_td-in_Zr,in_hl)', "m", "Zd − td − Zr ou saisie", "", "hl")
S.line("Portée entre axes, grands murs", "L1", "=in_a+in_tpm", "m", "a + t2", "", "L_gm")
S.line("Portée entre axes, petits murs", "L2", "=in_b+in_tgm", "m", "b + t1", "", "L_pm")
S.line("Hauteur entre plans moyens", "h", "=hl+in_td/2+in_tr/2", "m", "hl + td/2 + tr/2", "", "h_ax")
S.line("Profondeur de la tête de mur", "z1", "=ec+in_td", "m", "ec + td", "", "z_tete")
S.line("Profondeur du pied de mur", "z2", "=z_tete+hl", "m", "z1 + hl", "", "z_pied")
S.line("Longueur extérieure", "Aext", "=in_a+2*in_tpm", "m", "a + 2·t2", "", "A_ext")
S.line("Largeur extérieure", "Bext", "=in_b+2*in_tgm", "m", "b + 2·t1", "", "B_ext")
S.line("Aire nette de la dalle", "Ad", "=A_ext*B_ext-in_at*in_bt", "m²", "Aext·Bext − at·bt", "", "A_dalle")
S.line("Contrôle de saisie", "", '=IF(in_a>=in_b,"OK","a doit être ≥ b")', "", "a ≥ b", "", "chk_ab", fmt="@", verdict=True)

S.section("C. Sol")
S.line("Poids volumique du remblai", "γ", 20, "kN/m³", "", "", "gam_sol", True, "0.0")
S.line("Poids volumique déjaugé", "γ'", 10, "kN/m³", "", "", "gam_dej", True, "0.0")
S.line("Angle de frottement interne", "φ'", 30, "°", "", "", "phi_sol", True, "0.0")
S.line("Cohésion (non exploitée en v1)", "c'", 0, "kPa", "", "", "c_sol", True, "0.0")
S.line("Inclinaison du terrain", "βs", 0, "°", "", "", "beta_sol", True, "0.0")
S.line("Coefficient de poussée retenu", "", "K0", "", "K0 (mur tenu par la dalle) ou Ka", "EN 1997-1 §9.5", "in_Kchoix", True, "@", lst='"K0,Ka"')
S.line("Coefficient au repos", "K0", "=(1-SIN(RADIANS(phi_sol)))*(1+SIN(RADIANS(beta_sol)))", "", "(1 − sin φ')(1 + sin βs)", "EN 1997-1 §9.5.2", "K_repos", fmt="0.000")
S.line("Coefficient actif (terrain horizontal)", "Ka", "=TAN(RADIANS(45-phi_sol/2))^2", "", "tan²(45° − φ'/2)", "Rankine", "K_act", fmt="0.000")
S.line("Coefficient retenu", "K", '=IF(in_Kchoix="K0",K_repos,K_act)', "", "", "", "K_pou", fmt="0.000")
S.line("Pression de compactage active", "", "Non", "", "Oui ou Non", "", "in_comp", True, "@", lst='"Oui,Non"')
S.line("Pression de compactage", "σc", 15, "kPa", "uniforme sur la hauteur", "", "in_sigc", True, "0.0")
S.line("Pression de compactage retenue", "σc", '=IF(in_comp="Oui",in_sigc,0)', "kPa", "", "", "sig_c", fmt="0.0")

S.section("D. Nappe")
S.line("Présence d'une nappe", "", "Non", "", "Oui ou Non", "", "in_nappe", True, "@", lst='"Oui,Non"')
S.line("Mode Dimensions : profondeur de la nappe", "zw", 2.00, "m", "", "", "in_zw", True)
S.line("Mode Cotes : cote de la nappe", "Zw", 298.00, "m NGL", "", "", "in_Zn", True)
S.line("Profondeur de nappe retenue", "zw", '=IF(in_nappe="Non",999,IF(in_mode="Cotes",in_ZTN-in_Zn,in_zw))', "m", "999 = sans nappe", "", "z_nap")

S.section("E. Matériaux")
S.line("Classe d'exposition", "", "MX3", "", "MX1 à MX5", "EN 1996-2 annexe A", "in_MX", True, "@", lst='"MX1,MX2,MX3,MX4,MX5"')
S.line("Élément de maçonnerie (code catalogue)", "", "BBP20-24", "", "", "", "in_elem", True, "@", lst="=cat_code")
S.line("Mortier (code catalogue)", "", "M10-G", "", "", "", "in_mort", True, "@", lst="=mo_code_l")
S.line("Classe d'exécution", "", 5, "", "1 à 5, fixe γM (T1)", "EN 1996-1-1 Tab. 2.3", "in_cls", True, "0", lst='"1,2,3,4,5"')
S.line("Poids volumique de la maçonnerie", "γmaç", 20, "kN/m³", "", "", "in_gmac", True, "0.0")
S.line("Épaisseur de chaussée (comprise dans ec)", "ech", 0.10, "m", "", "", "in_ech", True)
S.line("Poids volumique de la chaussée", "γch", 24, "kN/m³", "", "", "in_gch", True, "0.0")
S.line("Liaison en pied de mur", "", "Joint de mortier", "", "Joint de mortier ou relevé béton", "", "in_liaison", True, "@", lst='"Joint de mortier,Relevé béton"')
S.line("Type d'élément", "", "=INDEX(cat_type,MATCH(in_elem,cat_code,0))", "", "", "Catalogue", "el_type", fmt="@")
S.line("Groupe", "", "=INDEX(cat_grp,MATCH(in_elem,cat_code,0))", "", "", "Catalogue", "el_grp", fmt="0")
S.line("Catégorie", "", "=INDEX(cat_cat,MATCH(in_elem,cat_code,0))", "", "", "Catalogue", "el_cat", fmt="@")
S.line("Résistance normalisée", "fb", "=INDEX(cat_fb,MATCH(in_elem,cat_code,0))", "N/mm²", "", "Catalogue", "el_fb", fmt="0.0")
S.line("Type de mortier", "", "=INDEX(mo_type_l,MATCH(in_mort,mo_code_l,0))", "", "G usage courant, T joint mince", "Catalogue", "mo_type", fmt="@")
S.line("Résistance du mortier", "fm", "=INDEX(mo_fm_l,MATCH(in_mort,mo_code_l,0))", "N/mm²", "", "Catalogue", "mo_fm", fmt="0.0")
S.line("Conception du mortier", "", "=INDEX(mo_conc_l,MATCH(in_mort,mo_code_l,0))", "", "", "Catalogue", "mo_conc", fmt="@")
S.line("Coefficient K", "K", '=INDEX(t2_K,MATCH(el_type&"|"&el_grp&"|"&mo_type,t2_key,0))', "", "", "EN 1996-1-1 Tab. 3.3", "K_mac", fmt="0.00")
S.line("Exposant α", "α", '=INDEX(t2_alpha,MATCH(el_type&"|"&el_grp&"|"&mo_type,t2_key,0))', "", "", "EN 1996-1-1 Tab. 3.3", "alpha_mac", fmt="0.00")
S.line("Exposant β", "β", '=INDEX(t2_beta,MATCH(el_type&"|"&el_grp&"|"&mo_type,t2_key,0))', "", "", "EN 1996-1-1 Tab. 3.3", "beta_mac", fmt="0.00")
S.line("Résistance caractéristique en compression", "fk", "=K_mac*el_fb^alpha_mac*mo_fm^beta_mac", "N/mm²", "K·fb^α·fm^β", "EN 1996-1-1 (3.1)", "fk")
S.line("Coefficient partiel", "γM", '=INDEX(t1_tab,VALUE(in_cls),IF(AND(el_cat="I",mo_conc="Performanciel"),1,2))', "", "T1", "EN 1996-1-1 §2.4.3", "gam_M")
S.line("Résistance de calcul en compression", "fd", "=fk/gam_M", "N/mm²", "fk / γM", "EN 1996-1-1 §2.4.1", "fd", fmt="0.000")
S.line("Résistance initiale au cisaillement", "fvk0", '=INDEX(t3_val,MATCH(el_type&"|"&IF(mo_type="T","Joint mince",IF(mo_fm>=10,"M10-M20",IF(mo_fm>=2.5,"M2,5-M9","M1-M2"))),t3_key,0))', "N/mm²", "T3", "EN 1996-1-1 Tab. 3.4", "fvk_0")
S.line("Limite de résistance au cisaillement", "fvlt", "=0.065*el_fb", "N/mm²", "0,065·fb", "EN 1996-1-1 §3.6.2", "fvlt", fmt="0.000")
S.line("Résistance en flexion, rupture parallèle aux joints", "fxk1", '=INDEX(t4_x1,MATCH(el_type&"|"&IF(mo_fm<5,"fm<5","fm>=5"),t4_key,0))', "N/mm²", "T4", "EN 1996-1-1 Tab. 3.6", "fxk_1")
S.line("Résistance en flexion, rupture perpendiculaire", "fxk2", '=INDEX(t4_x2,MATCH(el_type&"|"&IF(mo_fm<5,"fm<5","fm>=5"),t4_key,0))', "N/mm²", "T4", "EN 1996-1-1 Tab. 3.7", "fxk_2")
S.line("Coefficient de fluage final", "φ∞", "=INDEX(t10_phi,MATCH(el_type,t10_type,0))", "", "", "EN 1996-1-1 Tab. 3.8", "phi_inf", fmt="0.0")
S.line("Compatibilité avec la classe d'exposition", "", '=IF(AND(VALUE(RIGHT(in_MX,1))<=INDEX(cat_mx,MATCH(in_elem,cat_code,0)),VALUE(RIGHT(in_MX,1))<=INDEX(mo_mx_l,MATCH(in_mort,mo_code_l,0))),"OK","INCOMPATIBLE MX")', "", "MX saisie ≤ MX max élément et mortier", "EN 1996-2", "chk_mx", fmt="@", verdict=True)
S.line("Usage enterré de l'élément", "", '=IF(INDEX(cat_usage,MATCH(in_elem,cat_code,0))="Admis","OK","DÉCONSEILLÉ")', "", "", "Catalogue", "chk_usage", fmt="@", verdict=True)

S.section("F. Options de calcul")
S.line("Chemin de charge retenu pour le verdict", "", "Voûte horizontale", "", "Bande verticale, Plaque, Voûte horizontale", "", "in_chemin", True, "@", lst='"Bande verticale,Plaque,Voûte horizontale"')
S.line("Portée de la voûte horizontale", "", "Entre axes", "", "Entre axes (prudent) ou Libre", "EN 1996-1-1 §6.3.2", "in_la", True, "@", lst='"Entre axes,Libre"')
S.line("Angles harpés ou butées capables de la poussée", "", "Oui", "", "Condition de la voûte", "EN 1996-1-1 §6.3.2", "in_harpe", True, "@", lst='"Oui,Non"')
S.line("Rapport résistance parallèle / perpendiculaire aux joints", "kpar", 1.00, "", "1,0 pour éléments pleins", "", "in_kpar", True)
S.line("Pénétration de canalisation", "", "Aucune", "", "Tranches exclues de la voûte", "", "in_pen", True, "@", lst='"Aucune,Grand mur,Petit mur,Les deux"')
S.line("Pénétration : profondeur du haut", "zp1", 1.50, "m", "", "", "in_zp1", True)
S.line("Pénétration : profondeur du bas", "zp2", 1.90, "m", "", "", "in_zp2", True)
S.line("Vérifier la phase provisoire C3 (remblai avant dalle)", "", "Oui", "", "", "", "in_c3", True, "@", lst='"Oui,Non"')
S.line("Principe de source unique", "", "Non", "", "Oui : γG,sup aussi sur les terres stabilisantes", "EN 1990 §6.4.3", "in_su", True, "@", lst='"Oui,Non"')

S.section("G. Chargement")
S.line("Modèle de charge", "", "SLW 60", "", "SLW 60, LM1 ou Utilisateur", "T8", "in_mod", True, "@", lst='"SLW 60,LM1,Utilisateur"')
S.line("Position de la charge", "", "À côté du regard", "", "", "", "in_pos", True, "@", lst='"À côté du regard,Sur la dalle (hors tampon),Sur le tampon,À cheval"')
S.line("Poussée due au trafic adjacent", "", "Surcharge équivalente", "", "Surcharge équivalente ou Boussinesq", "NAVFAC DM 7.02", "in_optlat", True, "@", lst='"Surcharge équivalente,Boussinesq"')
S.line("Distance roue la plus proche / parement", "d", 0.50, "m", "Boussinesq", "", "in_d", True)
S.line("Angle de diffusion dans le recouvrement", "θ", 30, "°", "30° pour un remblai", "", "in_theta", True, "0")
S.line("Transmission de la dalle aux murs", "", "Aires tributaires", "", "Aires tributaires ou Charge linéaire saisie", "", "in_trans", True, "@", lst='"Aires tributaires,Charge linéaire saisie"')
S.line("Nombre de roues sur la dalle", "nr", 2, "", "positions sur dalle ou tampon", "", "in_nroues", True, "0")
S.line("Utilisateur : surcharge sur remblai", "qu", 10, "kPa", "", "", "in_qu", True, "0.0")
S.line("Utilisateur : charge ponctuelle (par roue)", "P", 50, "kN", "", "", "in_P", True, "0.0")
S.line("Utilisateur : empreinte transversale", "a0", 0.40, "m", "", "", "in_a0", True)
S.line("Utilisateur : empreinte longitudinale", "b0", 0.40, "m", "", "", "in_b0", True)
S.line("Utilisateur : charge répartie sur la dalle", "qd", 0, "kPa", "", "", "in_qd", True, "0.0")
S.line("Charge linéaire spéciale, grands murs (variable)", "nu,1", 0, "kN/m", "s'ajoute à la transmission", "", "in_nugm", True, "0.0")
S.line("Charge linéaire spéciale, petits murs (variable)", "nu,2", 0, "kN/m", "s'ajoute à la transmission", "", "in_nupm", True, "0.0")
S.line("Excentricité de la charge linéaire spéciale", "eu", 0, "m", "par rapport à l'axe du mur", "", "in_eu", True, "0.000")

S.section("H. Actions dérivées")
S.line("Rang du modèle dans T8", "", "=MATCH(in_mod,t8_head,0)", "", "", "", "mod_i", fmt="0")
S.line("Charge par roue", "Pw", "=INDEX(t8_Pw,1,mod_i)", "kN", "", "T8", "Pw", fmt="0.0")
S.line("Roues par essieu", "nw", "=INDEX(t8_nw,1,mod_i)", "", "", "T8", "tr_nw", fmt="0")
S.line("Nombre d'essieux", "na", "=INDEX(t8_na,1,mod_i)", "", "", "T8", "tr_na", fmt="0")
S.line("Espacement des essieux", "s", "=INDEX(t8_s,1,mod_i)", "m", "", "T8", "tr_s")
S.line("Voie", "v", "=INDEX(t8_v,1,mod_i)", "m", "", "T8", "tr_v")
S.line("Empreinte transversale", "a0", "=INDEX(t8_a0,1,mod_i)", "m", "", "T8", "tr_a0")
S.line("Empreinte longitudinale", "b0", "=INDEX(t8_b0,1,mod_i)", "m", "", "T8", "tr_b0")
S.line("Surcharge équivalente sur remblai", "qeq", "=INDEX(t8_q,1,mod_i)", "kPa", "", "T8", "q_eq", fmt="0.0")
S.line("Coefficient partiel du trafic", "γQ", "=INDEX(t8_gQ,1,mod_i)", "", "", "T8", "gam_Q")
S.line("Trafic sur le remblai adjacent actif", "", '=IF(OR(in_pos="À côté du regard",in_pos="À cheval"),1,0)', "", "1 = oui", "", "lat_on", fmt="0")
S.line("Trafic sur la dalle actif", "", '=IF(in_pos="À côté du regard",0,1)', "", "1 = oui", "", "vert_on", fmt="0")
S.line("Coefficient des terres stabilisantes (C2)", "γG,stb", '=IF(in_su="Oui",gG_sup,gG_inf)', "", "source unique : γG,sup", "EN 1990 §6.4.3", "gG_stb")
S.line("Terres et chaussée sur la dalle", "gt", "=in_gch*MIN(in_ech,ec)+gam_sol*MAX(ec-in_ech,0)", "kPa", "γch·ech + γ·(ec − ech)", "", "g_terre", fmt="0.00")
S.line("Poids propre de la dalle", "gd", "=gam_beton*in_td", "kPa", "25·td", "", "g_dal", fmt="0.00")
S.line("Résultante des terres sur la dalle", "Wt", "=g_terre*A_dalle", "kN", "gt·Ad", "", "W_terre", fmt="0.0")
S.line("Résultante du poids de la dalle", "Wd", "=g_dal*A_dalle", "kN", "gd·Ad", "", "W_dal", fmt="0.0")
S.line("Trafic total sur la dalle", "Qd", '=vert_on*(in_nroues*Pw+IF(in_mod="Utilisateur",in_qd*A_dalle,0))', "kN", "nr·Pw (+ qd·Ad)", "", "Q_dalle", fmt="0.0")
S.line("Fraction linéique, grands murs", "f1", "=(2*L_gm-L_pm)/(4*L_gm^2)", "1/m", "(2A − B)/(4A²), A = L1, B = L2", "Aires tributaires à 45°", "f_gm", fmt="0.0000")
S.line("Fraction linéique, petits murs", "f2", "=1/(4*L_gm)", "1/m", "1/(4A)", "Aires tributaires à 45°", "f_pm", fmt="0.0000")
S.line("Terres sur dalle, grands murs (G)", "nt,1", "=W_terre*f_gm", "kN/m", "Wt·f1", "", "nt_gm", fmt="0.00")
S.line("Terres sur dalle, petits murs (G)", "nt,2", "=W_terre*f_pm", "kN/m", "Wt·f2", "", "nt_pm", fmt="0.00")
S.line("Dalle, grands murs (G)", "nd,1", "=W_dal*f_gm", "kN/m", "Wd·f1", "", "nd_gm", fmt="0.00")
S.line("Dalle, petits murs (G)", "nd,2", "=W_dal*f_pm", "kN/m", "Wd·f2", "", "nd_pm", fmt="0.00")
S.line("Trafic, grands murs (Q)", "nQ,1", '=IF(in_trans="Aires tributaires",Q_dalle*f_gm,0)+in_nugm', "kN/m", "Qd·f1 + nu,1", "", "nq_gm", fmt="0.00")
S.line("Trafic, petits murs (Q)", "nQ,2", '=IF(in_trans="Aires tributaires",Q_dalle*f_pm,0)+in_nupm', "kN/m", "Qd·f2 + nu,2", "", "nq_pm", fmt="0.00")
S.line("Poussée de calcul des terres en tête", "ps,1", "=gG_sup*(" + soil_k("z_tete") + "+sig_c)", "kPa", "γG·(K·γ·z1 + σc), nappe comprise", "EN 1997-1 §9.5", "psd_tete", fmt="0.0")
S.line("Poussée de calcul des terres en pied", "ps,2", "=gG_sup*(" + soil_k("z_pied") + "+sig_c)", "kPa", "γG·(K·γ·z2 + σc), nappe comprise", "EN 1997-1 §9.5", "psd_pied", fmt="0.0")
r_pqmax = S.line("Poussée caractéristique maximale du trafic", "pQ,max", 0, "kPa", "max du tableau T-H2", "", "pQ_max", fmt="0.0")
r_pedmax = S.line("Poussée de calcul maximale", "pEd,max", 0, "kPa", "max du tableau T-H2", "", "pEd_max", fmt="0.0")

# Tableau des roues
S.section("Tableau T-H1 : roues pour la méthode de Boussinesq")
table_header(wsS, S.r, ["Roue", "Essieu k", "Côté j", "x (m)", "y (m)", "Q (kN)"])
S.r += 1
wheel_rows = []
w = 0
for k in (1, 2, 3):
    for j in (1, 2):
        w += 1
        r = S.r
        vals = [f"R{w}", k, j,
                f"=in_d+(C{r}-1)*tr_v",
                f"=(B{r}-(tr_na+1)/2)*tr_s",
                f"=IF(AND(B{r}<=tr_na,C{r}<=tr_nw),Pw,0)"]
        for c_i, v in enumerate(vals):
            c = wsS.cell(r, 1 + c_i, v)
            c.font = F_N
            c.border = B_ALL
            c.number_format = "0.00"
            c.alignment = Alignment(horizontal="center")
        wheel_rows.append(r)
        S.r += 1
S.note("x : distance au parement ; y : décalage le long du mur ; σh = Boussinesq modifiée × cos²(1,1·θ), θ = atan(y/x).")


def bouss_sum_cells(row, z_ref, first_col):
    """Écrit 6 colonnes auxiliaires (une par roue) et renvoie la plage."""
    for i, wr in enumerate(wheel_rows):
        col = first_col + i
        f = "=" + bouss(f"'0_Saisie'!$D${wr}", f"'0_Saisie'!$E${wr}", f"'0_Saisie'!$F${wr}", z_ref)
        c = wsS.cell(row, col, f)
        c.font = F_AUX
        c.number_format = "0.00"
    return f"{CL(first_col)}{row}:{CL(first_col + 5)}{row}"


AUX0 = 8  # colonne H : début des colonnes auxiliaires (hors impression)

# Tableau des tranches horizontales (11 niveaux)
S.section("Tableau T-H2 : poussée par niveau (tranches de la voûte, 11 niveaux de z1 à z2)")
hdr = ["Niveau j", "z (m)", "σs,k (kPa)", "pQ,k (kPa)", "pEd (kPa)", "Tranche exclue"]
table_header(wsS, S.r, hdr)
for i, h in enumerate(["excl. GM", "excl. PM", "pEd GM", "pEd PM", "", "Boussinesq R1", "R2", "R3", "R4", "R5", "R6"]):
    c = wsS.cell(S.r, AUX0 + i, h)
    c.font = F_AUX
wsS.cell(S.r - 1, AUX0, "Calcul auxiliaire (hors impression)").font = F_AUX
S.r += 1
t_first = S.r
for j in range(11):
    r = S.r
    z = f"B{r}"
    rng = bouss_sum_cells(r, z, AUX0 + 5)
    vals = [j, f"=z_tete+{j}*hl/10",
            "=" + soil_k(z),
            f'=lat_on*IF(in_optlat="Surcharge équivalente",K_pou*q_eq,SUM({rng}))',
            f"=gG_sup*(C{r}+sig_c)+gam_Q*D{r}",
            f'=IF(AND(H{r}=1,I{r}=1),"GM et PM",IF(H{r}=1,"GM",IF(I{r}=1,"PM","")))']
    for c_i, v in enumerate(vals):
        c = wsS.cell(r, 1 + c_i, v)
        c.font = F_N
        c.border = B_ALL
        c.number_format = "0" if c_i == 0 else "0.00"
        c.alignment = Alignment(horizontal="center")
    aux = [f'=IF(AND(OR(in_pen="Grand mur",in_pen="Les deux"),B{r}>=in_zp1,B{r}<=in_zp2),1,0)',
           f'=IF(AND(OR(in_pen="Petit mur",in_pen="Les deux"),B{r}>=in_zp1,B{r}<=in_zp2),1,0)',
           f"=IF(H{r}=1,0,E{r})", f"=IF(I{r}=1,0,E{r})"]
    for c_i, v in enumerate(aux):
        c = wsS.cell(r, AUX0 + c_i, v)
        c.font = F_AUX
        c.number_format = "0.00"
    S.r += 1
t_last = S.r - 1
add_name("tr_z", wsS, 2, t_first, 2, t_last)
add_name("tr_pEd", wsS, 5, t_first, 5, t_last)
add_name("tr_excl_gm", wsS, AUX0, t_first, AUX0, t_last)
add_name("tr_excl_pm", wsS, AUX0 + 1, t_first, AUX0 + 1, t_last)
add_name("tr_p_gm", wsS, AUX0 + 2, t_first, AUX0 + 2, t_last)
add_name("tr_p_pm", wsS, AUX0 + 3, t_first, AUX0 + 3, t_last)
wsS.cell(r_pqmax, 3, f"=MAX(D{t_first}:D{t_last})")
wsS.cell(r_pedmax, 3, f"=MAX(E{t_first}:E{t_last})")
S.note("pEd = γG·(σs,k + σc) + γQ·pQ,k ; σs,k = K·γ·z au-dessus de la nappe, K·(γ·zw + γ'·(z − zw)) + γw·(z − zw) au-dessous.")

# Tableau de statique (41 points sur h)
S.section("Tableau T-H3 : poussée de calcul le long de la bande verticale (41 points sur h)")
table_header(wsS, S.r, ["Point i", "x (m)", "z (m)", "pQ,k (kPa)", "pEd (kPa)", "Contact"])
S.r += 1
s_first = S.r
NP = 41
for i in range(NP):
    r = S.r
    z = f"C{r}"
    rng = bouss_sum_cells(r, f"MAX({z},0.001)", AUX0 + 5)
    vals = [i, f"={i}*h_ax/{NP-1}", f"=z_tete-in_td/2+B{r}",
            f'=lat_on*IF(in_optlat="Surcharge équivalente",K_pou*q_eq,SUM({rng}))',
            f"=F{r}*(gG_sup*(" + soil_k(z) + f"+sig_c)+gam_Q*D{r})",
            f"=IF(AND(C{r}>=z_tete-0.0001,C{r}<=z_pied+0.0001),1,0)"]
    for c_i, v in enumerate(vals):
        c = wsS.cell(r, 1 + c_i, v)
        c.font = F_N
        c.border = B_ALL
        c.number_format = "0" if c_i in (0, 5) else "0.000" if c_i in (1, 2) else "0.00"
        c.alignment = Alignment(horizontal="center")
    S.r += 1
s_last = S.r - 1
add_name("st_x", wsS, 2, s_first, 2, s_last)
add_name("st_p", wsS, 5, s_first, 5, s_last)
S.note("x mesuré depuis le plan moyen de la dalle ; la poussée n'agit qu'entre z1 et z2 (contact = 1).")
saisie_last = S.r
page_setup(wsS, 6, saisie_last)

# ===========================================================================
# 3_Predim
# ===========================================================================
WID2 = [31, 9, 11, 11, 7, 31, 15]
P = Writer(wsP, 2, "3_Predim : méthode simplifiée EN 1996-3 §4.5", WID2)
P.section("Conditions d'application (EN 1996-3 §4.5)")
P.line("Hauteur libre du mur", "hl", "=hl", "m", "hl ≤ 2,6 m", "§4.5(1)")
P.line("Condition sur la hauteur", "", '=IF(hl<=2.6,"OK","HORS DOMAINE")', "", "", "", N2("pc_h"), fmt="@", verdict=True)
P.line("Épaisseur du mur", "t", W2("in_t{w}"), "m", "t ≥ 0,20 m", "§4.5(1)")
P.line("Condition sur l'épaisseur", "", W2('IF(in_t{w}>=0.2,"OK","HORS DOMAINE")'), "", "", "", N2("pc_t"), fmt="@", verdict=True)
P.line("Plancher en tête formant diaphragme", "", "Oui", "", "dalle BA (hypothèse de l'outil)", "§4.5(1)", fmt="@")
P.line("Surcharge caractéristique sur le remblai", "q", "=lat_on*q_eq", "kPa", "q ≤ 5 kPa", "§4.5(1)")
P.line("Condition sur la surcharge", "", '=IF(lat_on*q_eq<=5,"OK","HORS DOMAINE")', "", "", "", N2("pc_q"), fmt="@", verdict=True)
P.line("Charge concentrée à moins de 1,5 m du mur", "Qc", '=IF(OR(AND(lat_on=1,in_d<=1.5),vert_on=1),Pw,0)', "kN", "Qc ≤ 15 kN", "§4.5(1)", fmt="0.0")
P.line("Condition sur la charge concentrée", "", '=IF(IF(OR(AND(lat_on=1,in_d<=1.5),vert_on=1),Pw,0)<=15,"OK","HORS DOMAINE")', "", "", "", N2("pc_c"), fmt="@", verdict=True)
P.line("Condition sur le terrain (ne remonte pas)", "", '=IF(beta_sol<=0,"OK","HORS DOMAINE")', "", "βs ≤ 0", "§4.5(1)", N2("pc_b"), fmt="@", verdict=True)
P.line("Hauteur de remblai retenue", "he", "=z_pied", "m", "he = z2 (prudent)", "§4.5(1)")
P.line("Condition sur la hauteur de remblai", "", '=IF(z_pied<=1.15*hl,"OK","HORS DOMAINE")', "", "he ≤ 1,15·hl", "", N2("pc_he"), fmt="@", verdict=True)
P.line("Condition sur la nappe", "", '=IF(in_nappe="Non","OK","HORS DOMAINE")', "", "pas de pression hydrostatique", "§4.5(1)", N2("pc_w"), fmt="@", verdict=True)
P.line("Domaine d'application", "", W2('IF(AND(pc_h_{w}="OK",pc_t_{w}="OK",pc_q_{w}="OK",pc_c_{w}="OK",pc_b_{w}="OK",pc_he_{w}="OK",pc_w_{w}="OK"),"DANS LE DOMAINE","HORS DOMAINE")'),
       "", "valeurs suivantes indicatives si hors domaine", "", N2("pre_dom"), fmt="@", verdict=True)
P.section("Encadrement de l'effort normal (b = 1 m)")
P.line("Espacement des refends (portée du mur)", "bc", W2("L_{w}"), "m", "", "")
P.line("Coefficient β", "β", W2("IF(L_{w}>=2*hl,20,IF(L_{w}<=hl,60,60-40*(L_{w}/hl-1)))"), "", "20 si bc ≥ 2h ; 60 si bc ≤ h ; interpolation", "§4.5(2)", N2("pre_beta"), fmt="0.0")
P.line("Profondeur du niveau de calcul", "zc", "=MAX(z_tete,z_pied-0.5*z_pied)", "m", "mi-hauteur du remblai (0,5·he), à confirmer", "", "pre_zc")
P.line("Effort normal maximal (C1)", "NEd,max", W2("gG_sup*(nt_{w}+nd_{w})+gam_Q*nq_{w}+gG_sup*in_gmac*in_t{w}*(pre_zc-z_tete)"), "kN/m", "1,35·G + γQ·Q", "EN 1990", N2("pre_Nmax"), fmt="0.0")
P.line("Effort normal minimal (C2)", "NEd,min", W2("gG_stb*nt_{w}+gG_inf*nd_{w}+gG_inf*in_gmac*in_t{w}*(pre_zc-z_tete)"), "kN/m", "1,0·G, sans trafic sur dalle", "EN 1990", N2("pre_Nmin"), fmt="0.0")
P.line("Borne supérieure", "NRd,max", W2("in_t{w}*fd*1000/3"), "kN/m", "t·b·fd/3", "EN 1996-3 (4.15)", N2("pre_NRd"), fmt="0.0")
P.line("Borne inférieure requise", "Nmin,req", W2("gam_sol*hl*z_pied^2/(pre_beta_{w}*in_t{w})"), "kN/m", "ρe·b·h·he²/(β·t)", "EN 1996-3 (4.16)", N2("pre_Nreq"), fmt="0.0")
P.line("Taux NEd,max / NRd,max", "", W2("pre_Nmax_{w}/pre_NRd_{w}"), "", "", "", N2("pre_r1"))
P.line("Taux Nmin,req / NEd,min", "", W2("pre_Nreq_{w}/MAX(pre_Nmin_{w},0.001)"), "", "", "", N2("pre_r2"))
P.line("Verdict du prédimensionnement", "", W2('IF(pre_dom_{w}<>"DANS LE DOMAINE","HORS DOMAINE",IF(MAX(pre_r1_{w},pre_r2_{w})<=1,"OK","NON VÉRIFIÉ"))'), "", "", "", N2("pre_v"), fmt="@", verdict=True)
page_setup(wsP, 7, P.r)

# ===========================================================================
# 4_Classique
# ===========================================================================
L = Writer(wsL, 2, "4_Classique : bande verticale isostatique", WID2)
L.note("Bande de 1 m sur appuis articulés (dalle, radier), charge trapézoïdale p1 → p2 sur toute la portée, trafic pris uniforme et égal à son maximum.")
L.section("Chargement de calcul")
L.line("Portée entre plans moyens", "h", "=h_ax", "m", "", "", "cl_h")
L.line("Poussée de calcul en tête", "p1", "=psd_tete+gam_Q*pQ_max", "kPa", "ps,1 + γQ·pQ,max", "EN 1997-1 §9.5", "cl_p1", fmt="0.0")
L.line("Poussée de calcul en pied", "p2", "=psd_pied+gam_Q*pQ_max", "kPa", "ps,2 + γQ·pQ,max", "EN 1997-1 §9.5", "cl_p2", fmt="0.0")
L.line("Écart", "Δp", "=cl_p2-cl_p1", "kPa", "p2 − p1", "", "cl_dp", fmt="0.0")
L.section("Efforts")
L.line("Réaction en tête", "R1", "=cl_h*(2*cl_p1+cl_p2)/6", "kN/m", "h(2p1 + p2)/6", "", "cl_R1", fmt="0.0")
L.line("Réaction en pied", "R2", "=cl_h*(cl_p1+2*cl_p2)/6", "kN/m", "h(p1 + 2p2)/6", "", "cl_R2", fmt="0.0")
L.line("Position du moment maximal", "x0", "=IF(ABS(cl_dp)<0.000001,cl_h/2,cl_h/cl_dp*(SQRT(cl_p1^2+2*cl_dp*cl_R1/cl_h)-cl_p1))", "m", "(h/Δp)(√(p1² + 2Δp·R1/h) − p1)", "", "cl_x0", fmt="0.000")
L.line("Moment maximal", "MEd", "=cl_R1*cl_x0-cl_p1*cl_x0^2/2-cl_dp*cl_x0^3/(6*cl_h)", "kNm/m", "R1·x0 − p1·x0²/2 − Δp·x0³/(6h)", "", "cl_M", fmt="0.00")
L.section("Efforts normaux au niveau x0")
L.line("Effort normal en tête (C1)", "Nt,C1", W2("gG_sup*(nt_{w}+nd_{w})+gam_Q*nq_{w}"), "kN/m", "1,35·G + γQ·Q", "EN 1990", N2("cl_Nt1"), fmt="0.0")
L.line("Effort normal en tête (C2)", "Nt,C2", W2("gG_stb*nt_{w}+gG_inf*nd_{w}"), "kN/m", "γG,stb·terres + 1,0·dalle", "EN 1990", N2("cl_Nt2"), fmt="0.0")
L.line("Effort normal en x0 (C1)", "NC1", W2("cl_Nt1_{w}+gG_sup*in_gmac*in_t{w}*MAX(cl_x0-in_td/2,0)"), "kN/m", "Nt + γG·γmaç·t·(x0 − td/2)", "", N2("cl_N1"), fmt="0.0")
L.line("Effort normal en x0 (C2)", "NC2", W2("cl_Nt2_{w}+gG_inf*in_gmac*in_t{w}*MAX(cl_x0-in_td/2,0)"), "kN/m", "", "", N2("cl_N2"), fmt="0.0")
L.section("Flexion composée (EN 1996-1-1 §6.1.2.2)")
L.line("Hauteur effective", "hef", "=rho_2*cl_h", "m", "ρ2·h", "§5.5.1.2", "cl_hef")
L.line("Excentricité initiale", "einit", "=cl_hef/450", "m", "hef/450", "§5.5.1.1", "cl_einit", fmt="0.0000")
L.line("Excentricité (C1)", "eC1", W2("cl_M/cl_N1_{w}+cl_einit"), "m", "MEd/N + einit", "", N2("cl_e1"), fmt="0.000")
L.line("Excentricité (C2)", "eC2", W2("cl_M/cl_N2_{w}+cl_einit"), "m", "MEd/N + einit", "", N2("cl_e2"), fmt="0.000")
L.line("Facteur de réduction (C1)", "Φ", W2("MAX(1-2*cl_e1_{w}/in_t{w},0)"), "", "1 − 2e/t", "(6.4)", N2("cl_phi"), fmt="0.000")
L.line("Résistance en compression (C1)", "NRd", W2("cl_phi_{w}*in_t{w}*fd*1000"), "kN/m", "Φ·t·fd", "(6.2)", N2("cl_NRd"), fmt="0.0")
L.line("Taux en compression (C1)", "", W2("IF(cl_NRd_{w}>0,cl_N1_{w}/cl_NRd_{w},99)"), "", "NC1/NRd", "", N2("cl_r1"))
L.line("Taux de stabilité (C2)", "", W2("cl_e2_{w}/(e_lim*in_t{w})"), "", "eC2/(0,45·t)", "", N2("cl_r2"))
L.line("Verdict en flexion composée", "", W2('IF(AND(cl_r1_{w}<=1,cl_r2_{w}<=1),"OK",IF(cl_r2_{w}>1,"INSTABLE","NON VÉRIFIÉ"))'), "", "", "", N2("cl_v1"), fmt="@", verdict=True)
L.line("Effort normal requis pour la stabilité", "Nreq", W2('IF(e_lim*in_t{w}-cl_einit>0,cl_M/(e_lim*in_t{w}-cl_einit),0)'), "kN/m", "MEd/(0,45·t − einit)", "", N2("cl_Nreq"), fmt="0.0")
L.section("Flexion seule (EN 1996-1-1 §6.3.1)")
L.line("Contrainte de compression (C2)", "σd", W2("cl_N2_{w}/in_t{w}"), "kPa", "NC2/t", "", N2("cl_sig"), fmt="0.0")
L.line("Résistance en flexion apparente", "fxd1,app", W2("fxk_1/gam_M*1000+cl_sig_{w}"), "kPa", "fxk1/γM + σd", "§6.3.1(4)", N2("cl_fx"), fmt="0.0")
L.line("Moment résistant", "MRd", W2("cl_fx_{w}*in_t{w}^2/6"), "kNm/m", "fxd1,app·t²/6", "(6.15)", N2("cl_MRd"), fmt="0.00")
L.line("Taux en flexion seule", "", W2("cl_M/cl_MRd_{w}"), "", "MEd/MRd", "", N2("cl_r3"))
L.section("Cisaillement aux appuis (EN 1996-1-1 §6.2)")
L.line("Effort tranchant en tête", "VEd,1", "=cl_R1", "kN/m", "R1", "", fmt="0.0")
L.line("Contrainte normale en tête (C2)", "σd,1", W2("cl_Nt2_{w}/in_t{w}"), "kPa", "", "", N2("cl_sv1"), fmt="0.0")
L.line("Résistance en tête", "VRd,1", W2("MIN(fvk_0+0.4*cl_sv1_{w}/1000,fvlt)/gam_M*1000*in_t{w}"), "kN/m", "min(fvk0 + 0,4σd ; fvlt)/γM·t", "(3.5), (6.13)", N2("cl_VR1"), fmt="0.0")
L.line("Taux en tête", "", W2("cl_R1/cl_VR1_{w}"), "", "", "", N2("cl_r4"))
L.line("Effort tranchant en pied", "VEd,2", "=cl_R2", "kN/m", "R2", "", fmt="0.0")
L.line("Contrainte normale en pied (C2)", "σd,2", W2("(cl_Nt2_{w}+gG_inf*in_gmac*in_t{w}*hl)/in_t{w}"), "kPa", "", "", N2("cl_sv2"), fmt="0.0")
L.line("Résistance en pied (joint)", "VRd,2", W2("MIN(fvk_0+0.4*cl_sv2_{w}/1000,fvlt)/gam_M*1000*in_t{w}"), "kN/m", "", "", N2("cl_VR2"), fmt="0.0")
L.line("Taux en pied", "", W2('IF(in_liaison="Relevé béton",0,cl_R2/cl_VR2_{w})'), "", "0 si relevé béton", "", N2("cl_r5"))
L.line("Verdict en cisaillement", "", W2('IF(MAX(cl_r4_{w},cl_r5_{w})<=1,IF(in_liaison="Relevé béton","OK (pied : relevé)","OK"),"NON VÉRIFIÉ")'), "", "", "", N2("cl_v2"), fmt="@", verdict=True)
L.section("Synthèse de la méthode classique")
L.line("Taux déterminant", "", W2("MAX(cl_r1_{w},MIN(cl_r2_{w},cl_r3_{w}),cl_r4_{w},cl_r5_{w})"), "", "stabilité : flexion composée OU flexion seule", "", N2("cl_rmax"))
L.line("Verdict", "", W2('IF(cl_rmax_{w}<=1,"OK","NON VÉRIFIÉ")'), "", "", "", N2("cl_v"), fmt="@", verdict=True)
page_setup(wsL, 7, L.r)

# ===========================================================================
# 5_Complete
# ===========================================================================
M = Writer(wsM, 2, "5_Complete : méthode complète EN 1996-1-1", WID2)
M.line("Chemin de charge retenu", "", "=in_chemin", "", "sélecteur de la feuille 0_Saisie", "", fmt="@")

M.section("10.1 Élancement (§5.5.1)")
M.line("Portée horizontale entre axes", "L", W2("L_{w}"), "m", "", "")
M.line("Hauteur entre plans moyens", "h", "=h_ax", "m", "", "")
M.line("Facteur ρ2", "ρ2", "=rho_2", "", "T10", "§5.5.1.2")
M.line("Facteur ρ4", "ρ4", W2("IF(h_ax<=1.15*L_{w},rho_2/(1+(rho_2*h_ax/L_{w})^2),0.5*L_{w}/h_ax)"), "", "h ≤ 1,15L : ρ2/(1 + (ρ2h/L)²) ; sinon 0,5L/h", "(5.6), (5.7)", N2("cp_rho4"), fmt="0.000")
M.line("Hauteur effective", "hef", W2("cp_rho4_{w}*h_ax"), "m", "ρ4·h", "(5.2)", N2("cp_hef"), fmt="0.000")
M.line("Élancement", "hef/tef", W2("cp_hef_{w}/in_t{w}"), "", "≤ 27", "§5.5.1.4", N2("cp_lam"), fmt="0.0")
M.line("Verdict d'élancement", "", W2('IF(cp_lam_{w}<=27,"OK","NON VÉRIFIÉ")'), "", "", "", N2("cp_vlam"), fmt="@", verdict=True)
M.line("Excentricité initiale", "einit", W2("cp_hef_{w}/450"), "m", "hef/450", "§5.5.1.1", N2("cp_ei"), fmt="0.0000")

M.section("Efforts normaux")
M.line("En tête (C1)", "Nt,C1", W2("gG_sup*(nt_{w}+nd_{w})+gam_Q*nq_{w}"), "kN/m", "1,35·G + γQ·Q", "EN 1990", N2("cp_Nt1"), fmt="0.0")
M.line("En tête (C2)", "Nt,C2", W2("gG_stb*nt_{w}+gG_inf*nd_{w}"), "kN/m", "γG,stb·terres + 1,0·dalle", "EN 1990", N2("cp_Nt2"), fmt="0.0")
M.line("En pied (C1)", "Nb,C1", W2("cp_Nt1_{w}+gG_sup*in_gmac*in_t{w}*hl"), "kN/m", "Nt + γG·γmaç·t·hl", "", N2("cp_Nb1"), fmt="0.0")
M.line("En pied (C2)", "Nb,C2", W2("cp_Nt2_{w}+gG_inf*in_gmac*in_t{w}*hl"), "kN/m", "", "", N2("cp_Nb2"), fmt="0.0")

M.section("10.2 Compression en tête et en pied (§6.1.2.2)")
M.line("Excentricité d'appui de la dalle", "e0", W2("e0_rel*in_t{w}"), "m", "e0/t (T10)·t", "", N2("cp_e0"), fmt="0.0000")
M.line("Excentricité en tête", "et", W2("MAX(cp_e0_{w}+gam_Q*in_nu{w}*in_eu/MAX(cp_Nt1_{w},0.001)+cp_ei_{w},0.05*in_t{w})"), "m", "Mid/Nid + ehe + einit ≥ 0,05t", "(6.5)", N2("cp_et"), fmt="0.0000")
M.line("Facteur Φ en tête", "Φt", W2("MAX(1-2*cp_et_{w}/in_t{w},0)"), "", "1 − 2et/t", "(6.4)", N2("cp_pt"), fmt="0.000")
M.line("Résistance en tête", "NRd,t", W2("cp_pt_{w}*in_t{w}*fd*1000"), "kN/m", "Φt·t·fd", "(6.2)", N2("cp_NRt"), fmt="0.0")
M.line("Excentricité en pied", "eb", W2("MAX(cp_ei_{w},0.05*in_t{w})"), "m", "einit ≥ 0,05t", "(6.5)", N2("cp_eb"), fmt="0.0000")
M.line("Facteur Φ en pied", "Φb", W2("1-2*cp_eb_{w}/in_t{w}"), "", "", "", N2("cp_pb"), fmt="0.000")
M.line("Résistance en pied", "NRd,b", W2("cp_pb_{w}*in_t{w}*fd*1000"), "kN/m", "", "", N2("cp_NRb"), fmt="0.0")
M.line("Taux en compression", "", W2("MAX(cp_Nt1_{w}/MAX(cp_NRt_{w},0.001),cp_Nb1_{w}/cp_NRb_{w})"), "", "max(Nt/NRd,t ; Nb/NRd,b)", "", N2("cp_r_comp"))

M.section("10.3 Flexion composée à mi-hauteur (annexe G)")
M.line("Moment isostatique de la poussée", "M0", "=st_Mmax", "kNm/m", "tableau de statique (bas de feuille)", "", fmt="0.00")
M.line("Part portée verticalement (Rankine-Grashof)", "kv", W2("L_{w}^4/(L_{w}^4+h_ax^4)"), "", "L⁴/(L⁴ + h⁴)", "", N2("cp_kv"), fmt="0.000")
M.line("Coefficient retenu", "k", W2('IF(in_chemin="Bande verticale",1,cp_kv_{w})'), "", "1 si bande verticale, sinon kv", "", N2("cp_k"), fmt="0.000")
M.line("Moment de calcul vertical", "Mmd", W2("cp_k_{w}*st_Mmax"), "kNm/m", "k·M0", "", N2("cp_M"), fmt="0.00")
M.line("Effort normal au niveau de M0 (C1)", "Nm,C1", W2("cp_Nt1_{w}+gG_sup*in_gmac*in_t{w}*MAX(st_x0-in_td/2,0)"), "kN/m", "", "", N2("cp_Nm1"), fmt="0.0")
M.line("Effort normal au niveau de M0 (C2)", "Nm,C2", W2("cp_Nt2_{w}+gG_inf*in_gmac*in_t{w}*MAX(st_x0-in_td/2,0)"), "kN/m", "", "", N2("cp_Nm2"), fmt="0.0")
for cmb, Nm, Nt in (("C1", "cp_Nm1", "cp_Nt1"), ("C2", "cp_Nm2", "cp_Nt2")):
    sfx = cmb[-1]
    M.line(f"Excentricité em ({cmb})", "em", W2(f"0.5*cp_e0_{{w}}*{Nt}_{{w}}/{Nm}_{{w}}+cp_M_{{w}}/{Nm}_{{w}}+cp_ei_{{w}}"), "m", "Mmd/Nmd + ehm + einit", "(6.7)", N2(f"cp_em{sfx}"), fmt="0.0000")
    M.line(f"Excentricité de fluage ({cmb})", "ek", W2(f"IF(cp_lam_{{w}}<=lam_c,0,0.002*phi_inf*cp_lam_{{w}}*SQRT(in_t{{w}}*cp_em{sfx}_{{w}}))"), "m", "0 si hef/tef ≤ λc", "(6.8)", N2(f"cp_ek{sfx}"), fmt="0.0000")
    M.line(f"Excentricité totale ({cmb})", "emk", W2(f"MAX(cp_em{sfx}_{{w}}+cp_ek{sfx}_{{w}},0.05*in_t{{w}})"), "m", "em + ek ≥ 0,05t", "(6.6)", N2(f"cp_emk{sfx}"), fmt="0.0000")
M.line("Élancement réduit", "λ", W2("cp_lam_{w}*SQRT(1/K_E)"), "", "(hef/tef)·√(fk/E)", "(G.2)", N2("cp_lr"), fmt="0.000")
for sfx in ("1", "2"):
    M.line(f"Facteur Φm (C{sfx})", "Φm", W2(f"IF(cp_emk{sfx}_{{w}}>=0.5*in_t{{w}},0,(1-2*cp_emk{sfx}_{{w}}/in_t{{w}})*EXP(-(((cp_lr_{{w}}-0.063)/(0.73-1.17*cp_emk{sfx}_{{w}}/in_t{{w}}))^2)/2))"),
           "", "A1·e^(−u²/2), u = (λ − 0,063)/(0,73 − 1,17emk/t)", "(G.1)", N2(f"cp_pm{sfx}"), fmt="0.000")
M.line("Taux en compression (C1)", "", W2("IF(cp_pm1_{w}>0,cp_Nm1_{w}/(cp_pm1_{w}*in_t{w}*fd*1000),99)"), "", "Nm,C1/(Φm·t·fd)", "", N2("cp_r_m1"))
M.line("Taux de stabilité (C2)", "", W2("cp_emk2_{w}/(e_lim*in_t{w})"), "", "emk,C2/(0,45·t)", "", N2("cp_r_m2"))
M.line("Verdict (pris en compte si bande verticale)", "", W2('IF(MAX(cp_r_m1_{w},cp_r_m2_{w})<=1,"OK","NON VÉRIFIÉ")'), "", "", "", N2("cp_v_m"), fmt="@", verdict=True)

M.section("10.4 Plaque sur quatre bords (annexe E)")
M.line("Rapport h/L", "h/L", W2("h_ax/L_{w}"), "", "", "", N2("cp_hL"), fmt="0.000")
M.line("Rapport d'orthotropie", "μ", "=fxk_1/fxk_2", "", "fxk1/fxk2", "§E", "cp_mu", fmt="0.000")
M.line("Table T5 renseignée", "", '=IF(COUNT(t5_grid)=ROWS(t5_grid)*COLUMNS(t5_grid),"OUI","NON")', "", "", "T5", "cp_t5ok", fmt="@")
M.line("Indice h/L dans T5", "i", W2("MIN(MATCH(MIN(MAX(cp_hL_{w},INDEX(t5_x,1)),INDEX(t5_x,COLUMNS(t5_x))),t5_x,1),COLUMNS(t5_x)-1)"), "", "", "", N2("cp_i"), fmt="0")
M.line("Indice μ dans T5", "j", "=MIN(MATCH(MIN(MAX(cp_mu,INDEX(t5_y,1)),INDEX(t5_y,ROWS(t5_y))),t5_y,1),ROWS(t5_y)-1)", "", "", "", "cp_j", fmt="0")
M.line("Interpolation en h/L", "tx", W2("(MIN(MAX(cp_hL_{w},INDEX(t5_x,1)),INDEX(t5_x,COLUMNS(t5_x)))-INDEX(t5_x,cp_i_{w}))/(INDEX(t5_x,cp_i_{w}+1)-INDEX(t5_x,cp_i_{w}))"), "", "", "", N2("cp_tx"), fmt="0.000")
M.line("Interpolation en μ", "ty", "=(MIN(MAX(cp_mu,INDEX(t5_y,1)),INDEX(t5_y,ROWS(t5_y)))-INDEX(t5_y,cp_j))/(INDEX(t5_y,cp_j+1)-INDEX(t5_y,cp_j))", "", "", "", "cp_ty", fmt="0.000")
M.line("Coefficient de moment", "α2", W2('IF(cp_t5ok="OUI",(1-cp_tx_{w})*(1-cp_ty)*INDEX(t5_grid,cp_j,cp_i_{w})+cp_tx_{w}*(1-cp_ty)*INDEX(t5_grid,cp_j,cp_i_{w}+1)+(1-cp_tx_{w})*cp_ty*INDEX(t5_grid,cp_j+1,cp_i_{w})+cp_tx_{w}*cp_ty*INDEX(t5_grid,cp_j+1,cp_i_{w}+1),0)'),
       "", "interpolation bilinéaire dans T5", "§E", N2("cp_a2"), fmt="0.0000")
M.line("Charge latérale de calcul", "WEd", "=pEd_max", "kPa", "maximum sur la hauteur (prudent)", "", fmt="0.0")
M.line("Moment, plan de rupture perpendiculaire aux joints", "MEd2", W2("cp_a2_{w}*pEd_max*L_{w}^2"), "kNm/m", "α2·WEd·L²", "(5.18)", N2("cp_M2"), fmt="0.00")
M.line("Moment, plan de rupture parallèle aux joints", "MEd1", W2("cp_mu*cp_M2_{w}"), "kNm/m", "μ·α2·WEd·L²", "(5.17)", N2("cp_M1"), fmt="0.00")
M.line("Moment résistant MRd1", "MRd1", W2("(fxk_1/gam_M*1000+cp_Nm2_{w}/in_t{w})*in_t{w}^2/6"), "kNm/m", "(fxd1 + σd)·t²/6", "(6.15)", N2("cp_MR1"), fmt="0.00")
M.line("Moment résistant MRd2", "MRd2", W2("fxk_2/gam_M*1000*in_t{w}^2/6"), "kNm/m", "fxd2·t²/6", "(6.15)", N2("cp_MR2"), fmt="0.00")
M.line("Taux en plaque", "", W2('IF(cp_t5ok="OUI",MAX(cp_M1_{w}/cp_MR1_{w},cp_M2_{w}/cp_MR2_{w}),99)'), "", "99 si T5 non renseignée", "", N2("cp_r_pl"))
M.line("Verdict en plaque", "", W2('IF(cp_t5ok<>"OUI","T5 NON RENSEIGNÉE",IF(cp_r_pl_{w}<=1,"OK","NON VÉRIFIÉ"))'), "", "", "", N2("cp_v_pl"), fmt="@", verdict=True)

M.section("10.5 Voûte horizontale (§6.3.2)")
M.line("Portée de la voûte", "la", ['=IF(in_la="Entre axes",L_gm,in_a)', '=IF(in_la="Entre axes",L_pm,in_b)'], "m", "entre axes ou libre", "", N2("cp_la"), fmt="0.000")
M.line("Rapport", "la/t", W2("cp_la_{w}/in_t{w}"), "", "≤ 25 : flèche d = 0", "§6.3.2(3)", N2("cp_lat"), fmt="0.0")
M.line("Flèche de l'arc", "r", W2("0.9*in_t{w}"), "m", "0,9t − d", "(6.14)", fmt="0.000")
M.line("Résistance parallèle aux joints", "fd,h", "=in_kpar*fd", "N/mm²", "kpar·fd", "", "cp_fdh", fmt="0.000")
M.line("Poussée de l'arc", "Nad", W2("1.5*cp_fdh*1000*in_t{w}/10"), "kN/m", "1,5·fd·t/10", "(6.15)", N2("cp_Nad"), fmt="0.0")
M.line("Résistance latérale de calcul", "qlat,d", W2("cp_fdh*1000*(in_t{w}/cp_la_{w})^2"), "kPa", "fd·(t/la)²", "(6.16)", N2("cp_qlat"), fmt="0.0")
M.line("Poussée maximale sur les tranches retenues", "pEd,max", W2("MAX(tr_p_{w})"), "kPa", "tableau T-H2, tranches exclues retirées", "", N2("cp_pv"), fmt="0.0")
M.line("Nombre de tranches exclues (pénétration)", "", W2("SUM(tr_excl_{w})"), "", "cadre béton requis si > 0", "", N2("cp_nex"), fmt="0")
M.line("Conditions d'application", "", W2('IF(AND(in_harpe="Oui",cp_lat_{w}<=25),"REMPLIES","NON REMPLIES")'), "", "angles harpés et la/t ≤ 25", "", N2("cp_vc"), fmt="@")
M.line("Taux de la voûte", "", W2('IF(cp_vc_{w}="REMPLIES",cp_pv_{w}/cp_qlat_{w},99)'), "", "pEd,max/qlat,d", "", N2("cp_r_v"))
M.line("Compression d'anneau sur le mur orthogonal", "σa", W2("cp_pv_{w}*L_{w}/2/in_t{o}"), "kPa", "pEd·L/2/t orth.", "", N2("cp_sa"), fmt="0.0")
M.line("Taux de l'anneau", "", W2("cp_sa_{w}/(cp_fdh*1000)"), "", "σa/fd,h", "", N2("cp_r_a"))
M.line("Verdict de la voûte", "", W2('IF(cp_vc_{w}<>"REMPLIES","NON APPLICABLE",IF(MAX(cp_r_v_{w},cp_r_a_{w})<=1,"OK","NON VÉRIFIÉ"))'), "", "", "", N2("cp_v_v"), fmt="@", verdict=True)

M.section("10.6 Charge concentrée sous la dalle (§6.1.3)")
M.line("Vérification active", "", '=IF(OR(in_pos="Sur la dalle (hors tampon)",in_pos="À cheval"),"OUI","SANS OBJET")', "", "roue sur la dalle près du mur", "", "cp_cact", fmt="@")
M.line("Empreinte diffusée transversale", "a0'", "=tr_a0+2*ec*TAN(RADIANS(in_theta))", "m", "a0 + 2·ec·tan θ", "", "cp_a0d", fmt="0.000")
M.line("Empreinte diffusée longitudinale", "b0'", "=tr_b0+2*ec*TAN(RADIANS(in_theta))", "m", "b0 + 2·ec·tan θ", "", "cp_b0d", fmt="0.000")
M.line("Longueur d'appui sur le mur", "lb", W2("MIN(L_{w},MIN(cp_a0d,cp_b0d)+in_td)"), "m", "min(a0', b0') + td, ≤ L", "", N2("cp_lb"), fmt="0.000")
M.line("Aire chargée", "Ab", W2("cp_lb_{w}*in_t{w}"), "m²", "lb·t", "", N2("cp_Ab"), fmt="0.0000")
M.line("Distance au bout du mur", "a1", W2("(L_{w}-cp_lb_{w})/2"), "m", "charge centrée", "", N2("cp_a1"), fmt="0.000")
M.line("Longueur efficace à mi-hauteur", "lefm", W2("MIN(L_{w},cp_lb_{w}+hl*TAN(RADIANS(30)))"), "m", "diffusion à 60°", "§6.1.3(3)", N2("cp_lef"), fmt="0.000")
M.line("Facteur de majoration", "β", W2("MIN(MAX((1+0.3*cp_a1_{w}/hl)*(1.5-1.1*cp_Ab_{w}/(cp_lef_{w}*in_t{w})),1),MIN(1.25+cp_a1_{w}/(2*hl),1.5))"), "", "(1 + 0,3a1/hc)(1,5 − 1,1Ab/Aef)", "(6.10)", N2("cp_beta"), fmt="0.000")
M.line("Effort concentré de calcul", "NEdc", W2("gam_Q*Pw+gG_sup*(nt_{w}+nd_{w})*cp_lb_{w}"), "kN", "γQ·Pw + G sur lb", "", N2("cp_Nc"), fmt="0.0")
M.line("Résistance", "NRdc", W2("cp_beta_{w}*cp_Ab_{w}*fd*1000"), "kN", "β·Ab·fd", "(6.9)", N2("cp_NRc"), fmt="0.0")
M.line("Taux", "", W2('IF(cp_cact="OUI",cp_Nc_{w}/cp_NRc_{w},0)'), "", "", "", N2("cp_r_c"))
M.line("Verdict", "", W2('IF(cp_cact<>"OUI","SANS OBJET",IF(cp_r_c_{w}<=1,"OK","NON VÉRIFIÉ"))'), "", "", "", N2("cp_v_c"), fmt="@", verdict=True)

M.section("10.7 Cisaillement aux liaisons (§6.2)")
M.line("Part verticale retenue", "k", W2("cp_k_{w}"), "", "1 si bande verticale, sinon kv", "", fmt="0.000")
M.line("Effort tranchant en tête", "VEd,t", W2("cp_k_{w}*st_R1"), "kN/m", "k·R1", "", N2("cp_Vt"), fmt="0.0")
M.line("Résistance en tête (C2)", "VRd,t", W2("MIN(fvk_0+0.4*cp_Nt2_{w}/in_t{w}/1000,fvlt)/gam_M*1000*in_t{w}"), "kN/m", "min(fvk0 + 0,4σd ; fvlt)/γM·t", "(6.13)", N2("cp_VRt"), fmt="0.0")
M.line("Effort tranchant en pied", "VEd,b", W2("cp_k_{w}*st_R2"), "kN/m", "k·R2", "", N2("cp_Vb"), fmt="0.0")
M.line("Résistance en pied (C2)", "VRd,b", W2("MIN(fvk_0+0.4*cp_Nb2_{w}/in_t{w}/1000,fvlt)/gam_M*1000*in_t{w}"), "kN/m", "", "(6.13)", N2("cp_VRb"), fmt="0.0")
M.line("Taux", "", W2('MAX(cp_Vt_{w}/cp_VRt_{w},IF(in_liaison="Relevé béton",0,cp_Vb_{w}/cp_VRb_{w}))'), "", "pied exclu si relevé béton", "", N2("cp_r_s"))
M.line("Effort à transmettre au relevé", "", W2('IF(in_liaison="Relevé béton",cp_Vb_{w},0)'), "kN/m", "", "", fmt="0.0")
M.line("Verdict", "", W2('IF(cp_r_s_{w}<=1,"OK","NON VÉRIFIÉ")'), "", "", "", N2("cp_v_s"), fmt="@", verdict=True)

M.section("10.8 Soulèvement (EN 1997-1 §2.4.7.4), regard vide")
M.line("Profondeur de la sous-face du radier", "zb", "=z_pied+in_tr", "m", "z2 + tr", "", "cp_zb")
M.line("Poussée d'Archimède", "U", "=gam_w*MAX(cp_zb-z_nap,0)*A_ext*B_ext", "kN", "γw·hw·Aext·Bext", "", "cp_U", fmt="0.0")
M.line("Poids stabilisant", "G", "=W_terre+W_dal+in_gmac*hl*2*(L_gm*in_tgm+L_pm*in_tpm)+gam_beton*in_tr*A_ext*B_ext", "kN", "terres + dalle + murs + radier", "", "cp_G", fmt="0.0")
M.line("Taux", "", "=IF(in_nappe=\"Oui\",gG_upl_dst*cp_U/(gG_upl_stb*cp_G),0)", "", "1,0·U/(0,9·G)", "EN 1997-1 (2.8)", N2("cp_r_u"))
M.line("Verdict", "", '=IF(in_nappe<>"Oui","SANS OBJET",IF(gG_upl_dst*cp_U<=gG_upl_stb*cp_G,"OK","NON VÉRIFIÉ"))', "", "", "", "cp_v_u", fmt="@", verdict=True)

M.section("10.9 Phase provisoire C3 : remblai avant coulage de la dalle")
M.line("Moment en console à la base", "M3", "=gG_sup*(K_pou*gam_sol*hl^3/6+sig_c*hl^2/2)", "kNm/m", "γG·(K·γ·hl³/6 + σc·hl²/2)", "", "cp_M3", fmt="0.00")
M.line("Effort normal à la base", "N3", W2("gG_inf*in_gmac*in_t{w}*hl"), "kN/m", "1,0·γmaç·t·hl", "", N2("cp_N3"), fmt="0.0")
M.line("Taux en console", "", W2("cp_M3/cp_N3_{w}/(e_lim*in_t{w})"), "", "(M3/N3)/(0,45t)", "", N2("cp_r3c"))
M.line("Poussée maximale provisoire", "p3", "=gG_sup*(K_pou*gam_sol*hl+sig_c)", "kPa", "γG·(K·γ·hl + σc)", "", "cp_p3", fmt="0.0")
M.line("Taux en voûte provisoire", "", W2('IF(cp_vc_{w}="REMPLIES",cp_p3/cp_qlat_{w},99)'), "", "p3/qlat,d", "", N2("cp_r3v"))
M.line("Verdict de la phase provisoire", "", W2('IF(in_c3<>"Oui","SANS OBJET",IF(OR(cp_r3c_{w}<=1,AND(in_chemin="Voûte horizontale",cp_r3v_{w}<=1)),"OK","REMBLAIEMENT INTERDIT AVANT DALLE"))'),
       "", "console OU voûte", "", N2("cp_v3"), fmt="@", verdict=True)

M.section("Synthèse de la méthode complète")
M.line("Taux du chemin de charge", "", W2('IF(in_chemin="Bande verticale",MAX(cp_r_m1_{w},cp_r_m2_{w}),IF(in_chemin="Plaque",cp_r_pl_{w},MAX(cp_r_v_{w},cp_r_a_{w})))'), "", "", "", N2("cp_r_path"))
M.line("Taux déterminant", "", W2("MAX(cp_r_comp_{w},cp_r_path_{w},cp_r_c_{w},cp_r_s_{w})"), "", "compression, chemin, concentrée, cisaillement", "", N2("cp_rmax"))
M.line("Mécanisme gouvernant", "", W2('IF(cp_rmax_{w}=cp_r_path_{w},in_chemin,IF(cp_rmax_{w}=cp_r_comp_{w},"Compression",IF(cp_rmax_{w}=cp_r_s_{w},"Cisaillement","Charge concentrée")))'), "", "", "", N2("cp_mech"), fmt="@")
M.line("Verdict", "", W2('IF(cp_rmax_{w}<=1,"OK","NON VÉRIFIÉ")'), "", "", "", N2("cp_v"), fmt="@", verdict=True)

# Tableau de statique
M.section("Annexe : statique de la bande verticale (intégration numérique du tableau T-H3)")
table_header(wsM, M.r, ["Point i", "x (m)", "pEd (kPa)", "F (kN/m)", "G (kN)", "M (kNm/m)", "", ""])
M.r += 1
m_first = M.r
for i in range(NP):
    r = M.r
    src = s_first + i
    vals = [i, f"='0_Saisie'!B{src}", f"='0_Saisie'!E{src}"]
    if i == 0:
        vals += [0, 0]
    else:
        vals += [f"=D{r-1}+(C{r-1}+C{r})/2*(B{r}-B{r-1})", f"=E{r-1}+(B{r-1}*C{r-1}+B{r}*C{r})/2*(B{r}-B{r-1})"]
    vals.append(f"=st_R1*B{r}-(B{r}*D{r}-E{r})")
    for c_i, v in enumerate(vals):
        c = wsM.cell(r, 1 + c_i, v)
        c.font = F_N
        c.border = B_ALL
        c.number_format = "0" if c_i == 0 else "0.000"
        c.alignment = Alignment(horizontal="center")
    M.r += 1
m_last = M.r - 1
M.line("Réaction en tête", "R1", f"=(h_ax*D{m_last}-E{m_last})/h_ax", "kN/m", "(h·F(h) − G(h))/h", "", "st_R1", fmt="0.0")
M.line("Réaction en pied", "R2", f"=D{m_last}-st_R1", "kN/m", "F(h) − R1", "", "st_R2", fmt="0.0")
M.line("Moment maximal", "M0", f"=MAX(F{m_first}:F{m_last})", "kNm/m", "max M(x)", "", "st_Mmax", fmt="0.00")
M.line("Position du moment maximal", "x0", f"=INDEX(B{m_first}:B{m_last},MATCH(st_Mmax,F{m_first}:F{m_last},0))", "m", "", "", "st_x0", fmt="0.000")
M.note("F(x) = ∫p, G(x) = ∫s·p (trapèzes) ; M(x) = R1·x − (x·F(x) − G(x)).")
page_setup(wsM, 7, M.r)

# ===========================================================================
# 6_Synthese
# ===========================================================================
ws = wsY
for i, w in enumerate([34, 16, 9, 9, 17, 17, 6], start=1):
    ws.column_dimensions[CL(i)].width = w
ws.cell(1, 1, "6_Synthese : taux de travail et verdicts").font = F_T
ws.cell(2, 1, '="Projet : "&in_projet&"     Réf. : "&in_ref&"     Indice : "&in_ind&"     Auteur : "&in_auteur').font = F_N
c = ws.cell(2, 6, "=in_date")
c.number_format = "dd/mm/yyyy"
c.font = F_N
table_header(ws, 3, ["Vérification", "Référence", "Taux GM", "Taux PM", "Verdict GM", "Verdict PM"])
r = 4


def ysec(t):
    global r
    r += 1
    ws.cell(r, 1, t).font = F_S
    for col in range(1, 7):
        ws.cell(r, col).border = B_BOT
    r += 1


def yrow(lab, ref, rg, rp, vg, vp):
    global r
    ws.cell(r, 1, lab).font = F_N
    ws.cell(r, 1).alignment = WRAP
    ws.cell(r, 2, ref).font = F_Q
    for col, v, fmt in ((3, rg, "0.00"), (4, rp, "0.00"), (5, vg, "@"), (6, vp, "@")):
        c = ws.cell(r, col, v)
        c.font = F_N if col < 5 else F_B
        c.number_format = fmt
        c.alignment = Alignment(horizontal="center", vertical="top", shrink_to_fit=(col >= 5), wrap_text=(col < 5))
        if col >= 5:
            c.border = BOX
    r += 1


ysec("Méthode complète EN 1996-1-1 (feuille 5)")
yrow("Compression en tête et en pied (C1)", "§6.1.2", "=cp_r_comp_gm", "=cp_r_comp_pm",
     '=IF(cp_r_comp_gm<=1,"OK","NON VÉRIFIÉ")', '=IF(cp_r_comp_pm<=1,"OK","NON VÉRIFIÉ")')
yrow("Flexion composée à mi-hauteur (C1, C2)", "annexe G", "=MAX(cp_r_m1_gm,cp_r_m2_gm)", "=MAX(cp_r_m1_pm,cp_r_m2_pm)", "=cp_v_m_gm", "=cp_v_m_pm")
yrow("Plaque sur quatre bords", "annexe E", '=IF(cp_t5ok="OUI",cp_r_pl_gm,0)', '=IF(cp_t5ok="OUI",cp_r_pl_pm,0)', "=cp_v_pl_gm", "=cp_v_pl_pm")
yrow("Voûte horizontale et anneau", "§6.3.2", '=IF(cp_vc_gm="REMPLIES",MAX(cp_r_v_gm,cp_r_a_gm),0)', '=IF(cp_vc_pm="REMPLIES",MAX(cp_r_v_pm,cp_r_a_pm),0)', "=cp_v_v_gm", "=cp_v_v_pm")
yrow("Charge concentrée sous la dalle", "§6.1.3", "=cp_r_c_gm", "=cp_r_c_pm", "=cp_v_c_gm", "=cp_v_c_pm")
yrow("Cisaillement aux liaisons", "§6.2", "=cp_r_s_gm", "=cp_r_s_pm", "=cp_v_s_gm", "=cp_v_s_pm")
yrow("Élancement", "§5.5.1.4", "=cp_lam_gm/27", "=cp_lam_pm/27", "=cp_vlam_gm", "=cp_vlam_pm")
yrow("Phase provisoire C3", "", '=IF(in_c3="Oui",MIN(cp_r3c_gm,IF(in_chemin="Voûte horizontale",cp_r3v_gm,99)),0)', '=IF(in_c3="Oui",MIN(cp_r3c_pm,IF(in_chemin="Voûte horizontale",cp_r3v_pm,99)),0)', "=cp_v3_gm", "=cp_v3_pm")
yrow("Soulèvement (regard vide)", "EN 1997-1", "=cp_r_u_gm", "=cp_r_u_pm", "=cp_v_u", "=cp_v_u")
r_main = r
yrow("VERDICT DE LA MÉTHODE COMPLÈTE", "chemin retenu", "=cp_rmax_gm", "=cp_rmax_pm", "=cp_v_gm", "=cp_v_pm")
for col in (1, 3, 4):
    ws.cell(r_main, col).font = F_B
yrow("Mécanisme gouvernant", "", "", "", "=cp_mech_gm", "=cp_mech_pm")
ws.cell(r, 1, "Taux 99 : mécanisme instable ou conditions d'application non remplies. Taux 0 : vérification sans objet.").font = F_Q
r += 1
ysec("Autres méthodes (feuilles 3 et 4)")
yrow("Prédimensionnement EN 1996-3 §4.5", "feuille 3", "=MAX(pre_r1_gm,pre_r2_gm)", "=MAX(pre_r1_pm,pre_r2_pm)", "=pre_v_gm", "=pre_v_pm")
yrow("Bande verticale classique", "feuille 4", "=cl_rmax_gm", "=cl_rmax_pm", "=cl_v_gm", "=cl_v_pm")

ysec("Hypothèses actives")
for lab, f in [("Modèle de charge / position", '=in_mod&" ; "&in_pos'),
               ("Poussée du trafic adjacent / transmission", '=in_optlat&" ; "&in_trans'),
               ("Chemin de charge / portée de voûte", '=in_chemin&" ; "&in_la'),
               ("Matériaux", '=in_elem&" ; "&in_mort&" ; fd = "&ROUND(fd,2)&" N/mm² ; γM = "&gam_M'),
               ("Sol / nappe / compactage", '="K = "&ROUND(K_pou,3)&" ; nappe : "&in_nappe&" ; compactage : "&in_comp'),
               ("Géométrie", '="a × b = "&in_a&" × "&in_b&" m ; hl = "&ROUND(hl,2)&" m ; ec = "&ROUND(ec,2)&" m ; t1 / t2 = "&in_tgm&" / "&in_tpm&" m"'),
               ("Source unique / γQ", '=in_su&" ; γQ = "&gam_Q')]:
    ws.cell(r, 1, lab).font = F_N
    c = ws.cell(r, 2, f)
    c.font = F_N
    ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=6)
    r += 1

ysec("Alertes")
alerts = [
    '=IF(OR(pre_dom_gm<>"DANS LE DOMAINE",pre_dom_pm<>"DANS LE DOMAINE"),"Prédimensionnement EN 1996-3 hors domaine : valeurs indicatives.","")',
    '=IF(chk_usage<>"OK","Élément déconseillé en enterré.","")',
    '=IF(chk_mx<>"OK","Élément ou mortier incompatible avec la classe d\'exposition.","")',
    '=IF(cp_nex_gm+cp_nex_pm>0,"Tranches exclues de la voûte par une pénétration : prévoir un cadre en béton.","")',
    '=IF(AND(in_chemin="Plaque",cp_t5ok<>"OUI"),"Table T5 (annexe E) non renseignée : vérification en plaque impossible.","")',
    '=IF(OR(cp_v3_gm="REMBLAIEMENT INTERDIT AVANT DALLE",cp_v3_pm="REMBLAIEMENT INTERDIT AVANT DALLE"),"Consigne : remblaiement interdit avant coulage de la dalle supérieure.","")',
    '=IF(in_mod="LM1","LM1 : répartition sur remblai selon EN 1991-2 §4.9.1 à vérifier.","")',
    '=IF(chk_ab<>"OK","Géométrie : a doit être supérieur ou égal à b.","")',
    '=IF(in_chemin="Voûte horizontale","Voûte horizontale : la flexion verticale est supposée redistribuée sur l\'arc (fissuration des joints d\'assise admise).","")',
    '=IF(in_liaison="Relevé béton","Liaison en pied par relevé béton : effort tranchant à justifier en béton armé (hors périmètre).","")',
    '="Tables normatives pré-remplies à vérifier (feuille 1_Coefficients)."',
]
for f in alerts:
    c = ws.cell(r, 1, f)
    c.font = F_N
    ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=6)
    r += 1
page_setup(ws, 6, r)

# ===========================================================================
# Protection (cellules de saisie déverrouillées), propriétés
# ===========================================================================
for sh in (wsS, wsC, wsK, wsP, wsL, wsM, wsY):
    sh.protection.sheet = True
    sh.protection.formatColumns = False
    sh.protection.formatRows = False
    sh.protection.insertRows = False
    sh.protection.deleteRows = False

wb.properties.title = "Vérification des regards en maçonnerie enterrée"
wb.properties.creator = "webaedificium"
wb.active = 0
wb.save(OUT)
print("Écrit :", OUT)
