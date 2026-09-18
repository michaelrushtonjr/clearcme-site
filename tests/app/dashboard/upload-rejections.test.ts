import { expect, test } from 'vitest';
import { certificateRejectionMessage } from '@/components/CertificateUpload';
test('oversize errors take priority when a file also has an unsupported type',()=>{
 expect(certificateRejectionMessage([{code:'file-invalid-type',message:'type'},{code:'file-too-large',message:'size'}])).toBe('File too large. Choose a file under 10 MB.');
});
test('unsupported and unknown rejection codes give an actionable message',()=>{
 expect(certificateRejectionMessage([{code:'file-invalid-type',message:'type'}])).toContain('PDF, JPG, or PNG');
 expect(certificateRejectionMessage([{code:'unrecognized',message:'opaque internal error'}])).toContain('Choose another file');
});
