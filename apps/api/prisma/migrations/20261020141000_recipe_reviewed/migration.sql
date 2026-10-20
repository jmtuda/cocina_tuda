-- Human review is explicit; existing and new recipes start unreviewed.
ALTER TABLE "recipes" ADD COLUMN "reviewed" BOOLEAN NOT NULL DEFAULT false;
