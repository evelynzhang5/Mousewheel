"""
Builds mice_tidy.csv (20 160 rows × 5 columns) from the four raw spreadsheets.
Run once:
    $ python preprocess.py
"""

import pathlib, pandas as pd

ROOT = pathlib.Path('data')          # folder that holds the CSVs
SEX_FILES = {
    "M": ("Mouse_Male_Act.csv",  "Mouse_Male_Temp.csv"),
    "F": ("Mouse_Fem_Act.csv",   "Mouse_Fem_Temp.csv"),
}

frames = []
for sex, (act_file, tmp_file) in SEX_FILES.items():
    # Activity ---------------------------------------------------------------
    act = (
        pd.read_csv(ROOT / act_file)
          .reset_index(names="Minute")           # 0 … 20 159 (14 d × 24 h × 60 min)
          .melt(id_vars="Minute",
                var_name="Mouse", value_name="Activity")
    )

    # Temperature ------------------------------------------------------------
    temp = (
        pd.read_csv(ROOT / tmp_file)
          .reset_index(names="Minute")
          .melt(id_vars="Minute",
                var_name="Mouse", value_name="Temp")
    )

    frames.append(
        act.merge(temp, on=["Minute", "Mouse"]).assign(Sex=sex)
    )

tidy = pd.concat(frames)
tidy.to_csv("mice_tidy.csv", index=False)
print("wrote mice_tidy.csv — shape:", tidy.shape)