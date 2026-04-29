## Deploy synthesize-speech edge function

Deploy the existing `supabase/functions/synthesize-speech/index.ts` edge function to Lovable Cloud so it appears under **Cloud → Edge Functions** and can be invoked by the `useSpeech` hook.

### What happens
1. Trigger deployment of the `synthesize-speech` function.
2. Once deployed, it shows up in the Edge Functions list in the Cloud view.

### After deployment — your action
Add these two secrets under **Cloud → Secrets**:
- `AZURE_SPEECH_KEY` — KEY 1 from your Azure Speech resource
- `AZURE_SPEECH_REGION` — region short code (e.g. `westeurope`)

No code changes required. The function and `useSpeech` hook are already wired up correctly.