from app.pipeline.build_bronze import load_bronze
from app.pipeline.build_silver import load_silver
from app.pipeline.build_gold import load_gold
from app.paths.config import APP_DIR


def main():
    load_bronze()
    load_silver()
    load_gold()


if __name__ == "__main__":
    main()