import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 1000;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "The university directory is not configured." },
      { status: 503 }
    );
  }

  const { searchParams } = request.nextUrl;
  const universityId = searchParams.get("universityId");

  if (universityId) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(universityId)) {
      return NextResponse.json({ error: "Invalid university ID." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("campus_settings")
      .select("require_matric_number, allowed_email_domains")
      .eq("university_id", universityId)
      .maybeSingle();

    if (error) {
      console.error("Failed to load registration settings for university:", error);
      return NextResponse.json(
        { error: "Campus registration settings could not be loaded." },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings: data });
  }

  const country = searchParams.get("country")?.trim();
  if (!country || country.length > 120) {
    return NextResponse.json(
      { error: "Choose a valid country." },
      { status: 400 }
    );
  }

  const universities: {
    id: string;
    name: string;
    short_name: string;
    country: string;
  }[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("universities")
      .select("id, name, short_name, country")
      .eq("country", country)
      .eq("is_active", true)
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("Failed to load active universities by country:", error);
      return NextResponse.json(
        { error: "Universities for this country could not be loaded." },
        { status: 500 }
      );
    }

    universities.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) {
      break;
    }
  }

  return NextResponse.json({ universities });
}
