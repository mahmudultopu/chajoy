# Product cut-outs

Official CHAJOY photos with their backgrounds removed, so the storefront can
place them on colour backdrops (`public/images/cutouts`). The pixels are the
original photos; nothing is generated.

Sources:
- `public/images/products/*` – crops of the official menu board. These are
  small (~480 px tall), so they were upscaled 4× with Swin2SR
  (`upscale.mjs`, model `Xenova/swin2SR-realworld-sr-x4-64-bsrgan-psnr`)
  before cutting out.
- `public/images/cutouts/hq/*` – products cut from CHAJOY's own
  high-resolution posters on its public Facebook page
  (`crop-cut.mjs`, crop boxes in a JSON jobs file).

Pipeline (run with `@huggingface/transformers` and `sharp` installed in a
scratch folder – they are not app dependencies):

    node upscale.mjs <products dir> <up dir> [names,comma,separated]
    HEIGHT=1200 node rmbg.mjs <up dir> <out dir> "" 24        # RMBG-1.4 + border clean-up
    node whiten.mjs <out dir> <final dir>                      # strip white leftovers (drinks only)

`GRAD=1` on `rmbg.mjs` also removes pale menu-green leftovers; use it only on
photos without pale green product colours (not on matcha or ice cream).
