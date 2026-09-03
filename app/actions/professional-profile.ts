"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";

function text(formData:FormData,key:string,max=200){return String(formData.get(key)??"").trim().slice(0,max);}

export async function updateProfessionalProfileAction(formData:FormData){
  const user=await requireUser();
  const accountType=text(formData,"accountType",20)==="PROFESSIONAL"?"PROFESSIONAL":"PRIVATE";
  const companyName=text(formData,"companyName",180)||null;
  const professionalTitle=text(formData,"professionalTitle",180)||null;
  if(accountType==="PROFESSIONAL"&&!companyName) redirect("/app/profil?error=Bitte%20Firmennamen%20angeben");
  await query("UPDATE users SET account_type=$1,company_name=$2,professional_title=$3 WHERE id=$4",[accountType,companyName,professionalTitle,user.id]);
  redirect("/app/profil?success=Profil%20gespeichert");
}
