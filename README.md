# bot 追加時

botData を firestore に入力して起動する

残タスク

- 問題リストアップ時に id を付与して新規・更新・削除管理できるように(isEnabled も)
- 問題リスト csv の export

csv と store が同期

id カラムを追加（csv と db）、deletedAt を追加（db のみ）

csv 上の
データ削除 → questions にのみ存在する id を論理削除
データ更新 → questions の該当 id のデータを更新
データ追加 → questions に新しい id でデータを set

csv ファイル名に timestamp を付与し、guilds 直下にファイル名を保存
次回アップロード時、ファイル名が前回と同一か、template でない限りアップロード拒否
template の場合は全削除（物理）して追加

-論理削除の場合の質問は csv 回答リストでは表示する

-回答一覧 csv 作成の際、questions を読み込むように修正する
