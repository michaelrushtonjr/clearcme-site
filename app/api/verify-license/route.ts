import { NextResponse } from "next/server";
import { auth } from "@/auth";

interface NPPESAddress {
  state: string;
  city: string;
  address_1?: string;
  postal_code?: string;
}

interface NPPESTaxonomy {
  desc?: string;
  primary?: boolean;
}

interface NPPESResult {
  number: string;
  basic?: {
    first_name?: string;
    last_name?: string;
    credential?: string;
    status?: string;
  };
  addresses?: NPPESAddress[];
  taxonomies?: NPPESTaxonomy[];
}

interface NPPESResponse {
  results?: NPPESResult[];
  result_count?: number;
}

interface PhysicianMatch {
  npi: string;
  name: string;
  credential: string;
  state: string;
  specialty: string;
  city: string;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { firstName, lastName, state } = body as {
    firstName?: string;
    lastName?: string;
    state?: string;
    licenseType?: string;
  };

  if (!firstName || !lastName || !state) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const normalizedFirstName = firstName.trim();
  const normalizedLastName = lastName.trim();
  const normalizedState = state.trim();

  // NPPES doesn't filter by credential type. We first search name + selected
  // license state, then fall back to name-only because NPPES state reflects the
  // provider's NPI practice/mailing address, not every state license they hold.
  async function queryNppes(searchState?: string): Promise<NPPESResponse> {
    const url = new URL("https://npiregistry.cms.hhs.gov/api/");
    url.searchParams.set("version", "2.1");
    url.searchParams.set("first_name", normalizedFirstName);
    url.searchParams.set("last_name", normalizedLastName);
    if (searchState) url.searchParams.set("state", searchState.trim());
    url.searchParams.set("enumeration_type", "NPI-1");
    url.searchParams.set("limit", "5");

    const res = await fetch(url.toString(), {
      headers: { "Accept": "application/json" },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      throw new Error(`NPPES returned ${res.status}`);
    }
    return res.json();
  }

  let data: NPPESResponse;
  try {
    data = await queryNppes(normalizedState);
    if ((data.results ?? []).length === 0) {
      data = await queryNppes();
    }
  } catch (err) {
    console.error("NPPES fetch error:", err);
    return NextResponse.json(
      { verified: false, matches: [], confidence: "low", error: "NPPES lookup failed" },
      { status: 200 }
    );
  }

  const results: NPPESResult[] = data.results ?? [];

  const matches: PhysicianMatch[] = results.map((r) => {
    const firstName = r.basic?.first_name ?? "";
    const lastName = r.basic?.last_name ?? "";
    const credential = r.basic?.credential ?? "";
    const primaryAddress = r.addresses?.find((a) => a.state === normalizedState) ?? r.addresses?.[0];
    const primaryTaxonomy = r.taxonomies?.find((t) => t.primary) ?? r.taxonomies?.[0];

    return {
      npi: r.number,
      name: [firstName, lastName].filter(Boolean).join(" "),
      credential,
      state: primaryAddress?.state ?? normalizedState,
      specialty: primaryTaxonomy?.desc ?? "",
      city: primaryAddress?.city ?? "",
    };
  });

  const count = matches.length;
  const verified = count === 1;
  const confidence: "high" | "medium" | "low" =
    count === 1 ? "high" : count >= 2 && count <= 3 ? "medium" : "low";

  return NextResponse.json({ verified, matches, confidence });
}
