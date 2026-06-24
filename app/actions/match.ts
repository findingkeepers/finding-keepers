'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

export async function requestMatch({
  profileShortId,
  profileName,
  profileGender,
}: {
  profileShortId: string;
  profileName: string;
  profileGender: string;
}) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "You must be logged in" };
    }

    // Get Requester's CV + Profile
    const { data: requesterCV } = await supabase
      .from('cvs')
      .select('short_id, data')
      .eq('user_id', user.id)
      .single();

    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', user.id)
      .single();

    // Get Requested Person's CV + Profile
    const { data: requestedCV } = await supabase
      .from('cvs')
      .select('short_id, data, user_id')
      .eq('short_id', profileShortId)
      .single();

    let requestedProfile = null;
    if (requestedCV?.user_id) {
      const { data } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', requestedCV.user_id)
        .single();
      requestedProfile = data;
    }

    if (!requesterCV || !requesterCV.data) {
      return { success: false, message: "Your CV not found" };
    }

    if (!requestedCV || !requestedCV.data) {
      return { success: false, message: "Requested profile not found" };
    }

    const isRequesterMale = requesterCV.data.gender?.toLowerCase() === 'male';

    // Requester Info
    const requesterShortId = requesterCV.short_id;
    const requesterName = requesterCV.data.fullName || 'N/A';
    const requesterPhone = requesterProfile?.phone || 'N/A';

    const requesterWaliName = requesterCV.data.waliName || 'N/A';
    const requesterWaliRelation = requesterCV.data.waliRelationship || 'N/A';
    const requesterWaliPhone = requesterCV.data.waliPhone || 'N/A';
    const requesterWaliEmail = requesterCV.data.waliEmail || 'N/A';

    // Requested Person Info
    const requestedShortId = requestedCV.short_id;
    const requestedName = requestedCV.data.fullName || profileName;
    const requestedPhone = requestedProfile?.phone || 'N/A';

    const requestedWaliName = requestedCV.data.waliName || 'N/A';
    const requestedWaliRelation = requestedCV.data.waliRelationship || 'N/A';
    const requestedWaliPhone = requestedCV.data.waliPhone || 'N/A';
    const requestedWaliEmail = requestedCV.data.waliEmail || 'N/A';

    // Insert into match_requests
    await supabase.from('match_requests').insert({
      male_short_id: isRequesterMale ? requesterShortId : requestedShortId,
      female_short_id: isRequesterMale ? requestedShortId : requesterShortId,
      male_name: isRequesterMale ? requesterName : requestedName,
      female_name: isRequesterMale ? requestedName : requesterName,
      status: 'pending'
    });

    // ==================== EMAIL ====================
    const emailResult = await sendEmail({
      to: 'findingkeepers@connecthk.org',
      subject: `New Match Request: ${requesterShortId} → ${requestedShortId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1f2937;">New Match Request</h2>
          <p style="font-size: 16px;">Assalamualaikum,</p>
          <p style="font-size: 15px; color: #374151;">A new match request has been submitted.</p>

          <!-- REQUESTER -->
          <h3 style="color: #1e40af; margin-top: 25px;">Person Who Requested</h3>
          <div style="background-color: #f0f9ff; padding: 16px; border-radius: 8px; margin-bottom: 25px;">
            <p><strong>Short ID:</strong> ${requesterShortId}</p>
            <p><strong>Name:</strong> ${requesterName}</p>
            <p><strong>Contact:</strong> ${requesterPhone}</p>
            <p><strong>Wali/Guarantor:</strong> ${requesterWaliName} (${requesterWaliRelation})</p>
            <p><strong>Wali Phone:</strong> ${requesterWaliPhone}</p>
            <p><strong>Wali Email:</strong> ${requesterWaliEmail}</p>
          </div>

          <!-- REQUESTED PERSON -->
          <h3 style="color: #9f1239; margin-top: 20px;">Person Request Sent To</h3>
          <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; margin-bottom: 25px;">
            <p><strong>Short ID:</strong> ${requestedShortId}</p>
            <p><strong>Name:</strong> ${requestedName}</p>
            <p><strong>Contact:</strong> ${requestedPhone}</p>
            <p><strong>Wali/Guarantor:</strong> ${requestedWaliName} (${requestedWaliRelation})</p>
            <p><strong>Wali Phone:</strong> ${requestedWaliPhone}</p>
            <p><strong>Wali Email:</strong> ${requestedWaliEmail}</p>
          </div>

          <p style="font-size: 15px; color: #4b5563;">Please handle this request manually.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="font-size: 13px; color: #9ca3af;">This is an automated email from Finding Keepers.</p>
        </div>
      `,
    });

    if (!emailResult.ok) {
      console.error("Match notification email failed:", emailResult.message);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Match request error:", error);
    return { success: false, message: error.message || "Something went wrong" };
  }
}