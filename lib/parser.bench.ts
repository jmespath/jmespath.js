import { Parser } from "./parser.ts";

Deno.bench("Parser > single_expr", () => {
  new Parser("foo");
});

Deno.bench("Parser > single_subexpr", function () {
  new Parser("foo.bar");
});

Deno.bench("Parser > deeply_nested_50", function () {
  new Parser(
    "j49.j48.j47.j46.j45.j44.j43.j42.j41.j40.j39.j38.j37.j36.j35.j34.j33.j32.j31.j30.j29.j28.j27.j26.j25.j24.j23.j22.j21.j20.j19.j18.j17.j16.j15.j14.j13.j12.j11.j10.j9.j8.j7.j6.j5.j4.j3.j2.j1.j0",
  );
});

Deno.bench("Parser > deeply_nested_50_index", function () {
  new Parser(
    "[49][48][47][46][45][44][43][42][41][40][39][38][37][36][35][34][33][32][31][30][29][28][27][26][25][24][23][22][21][20][19][18][17][16][15][14][13][12][11][10][9][8][7][6][5][4][3][2][1][0]",
  );
});

Deno.bench("Parser > basic_list_projection", function () {
  new Parser("foo[*].bar");
});
